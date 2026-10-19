import ast
import hashlib
import itertools
import json
import random
import re
from fractions import Fraction as F
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
REPO = 'gabrieladash123-bit/equal-purse'
CASES = json.loads((ROOT / 'config/scenarios.json').read_text())
SOURCE = ROOT / 'contracts/equal_purse.py'


def deploy(direct_deploy, accounts, case):
    return direct_deploy(str(SOURCE), REPO, case['voters'], accounts[:len(case['voters'])],
                         case['projects'], [f'Select the {p} project for the committee.' for p in case['projects']], case['seats'])


def mocks(vm, case, i, override=None, raw=None, http=200, audit=None, votes=None):
    vm.clear_mocks()
    body = (ROOT / 'ballots' / f"{case['id']}-{case['voters'][i]}.json").read_bytes() if raw is None else raw
    url = f'https://raw.githubusercontent.com/{REPO}/' + 'a'*40 + f"/ballots/{case['id']}-{case['voters'][i]}.json"
    vm.mock_web(re.escape(url), {'status': http, 'body': body})
    choices = [{'project': p, 'vote': v, 'anchors': [0]} for p, v in zip(case['projects'], votes or case['votes'][i])]
    result = {'choices': choices}
    if override is not None:
        result = override
    vm.mock_llm(r'.*EQUALPURSE-EXTRACT.*', json.dumps(result))
    vm.mock_llm(r'.*EQUALPURSE-AUDIT.*', json.dumps(audit if audit is not None else {'votes_correct': True, 'anchors_support': True}))
    return url, hashlib.sha256(body).hexdigest()


@pytest.mark.parametrize('case', CASES, ids=lambda c: c['id'])
def test_whole_election_and_independent_validator(direct_deploy, direct_vm, direct_accounts, case):
    contract = deploy(direct_deploy, direct_accounts, case)
    for i in reversed(range(len(case['voters']))):
        direct_vm.sender = direct_accounts[i]
        contract.cast(*mocks(direct_vm, case, i))
        assert direct_vm.run_validator() is True
    contract.close()
    state = contract.get_state()
    result = state['result']
    assert result['status'] == case['status']
    assert result['winners'] == case['winners']
    assert [b['voter'] for b in state['ballots']] == case['voters']
    if case['id'] == 'capped-payment':
        assert result['steps'][1]['cap'] == [7, 3]
        assert result['steps'][1]['payments'] == [[5, 3], [0, 1], [0, 1], [7, 3]]
    with direct_vm.expect_revert('Election closed'):
        contract.close()
    with direct_vm.expect_revert('Election closed'):
        contract.cast(*mocks(direct_vm, case, 0))


@pytest.fixture
def election(direct_deploy, direct_accounts, direct_vm):
    direct_vm.sender = direct_accounts[0]
    return deploy(direct_deploy, direct_accounts, CASES[0])


def test_only_registered_wallet_and_one_ballot(election, direct_vm, direct_accounts):
    direct_vm.sender = direct_accounts[6]
    with direct_vm.expect_revert('Voter only'):
        election.cast(*mocks(direct_vm, CASES[0], 0))
    direct_vm.sender = direct_accounts[0]
    args = mocks(direct_vm, CASES[0], 0)
    election.cast(*args)
    before = election.get_state()
    with direct_vm.expect_revert('Ballot already cast'):
        election.cast(*args)
    assert election.get_state() == before


def test_missing_ballots_cannot_close(election, direct_vm):
    with direct_vm.expect_revert('Missing ballots'):
        election.close()
    assert election.get_state()['closed'] is False


def test_constructor_accepts_native_address_objects(direct_deploy, direct_accounts, monkeypatch):
    from gltest.direct import loader
    original = loader._calldata_roundtrip_args
    def live_typed_addresses(args, kwargs):
        args, kwargs = original(args, kwargs)
        if len(args) == 6:
            from genlayer import Address
            args = (*args[:2], [Address(a) for a in args[2]], *args[3:])
        return args, kwargs
    monkeypatch.setattr(loader, '_calldata_roundtrip_args', live_typed_addresses)
    contract = deploy(direct_deploy, direct_accounts, CASES[0])
    assert [v['wallet'] for v in contract.get_state()['voters']] == ['0x'+a.hex() for a in direct_accounts[:6]]


@pytest.mark.parametrize('kind', ['few-voters','duplicate-voter','duplicate-wallet','zero-wallet',
                                 'bad-voter-id','few-projects','duplicate-project','short-meaning','zero-seats','too-many-seats'])
def test_invalid_configuration_rejected(direct_deploy, direct_accounts, kind):
    voters, wallets = ['amber','cobalt','jade'], list(direct_accounts[:3])
    projects, meanings, seats = ['library','clinic'], ['Select the library project.', 'Select the clinic project.'], 2
    if kind == 'few-voters': voters, wallets = voters[:2], wallets[:2]
    if kind == 'duplicate-voter': voters[1] = voters[0]
    if kind == 'duplicate-wallet': wallets[1] = wallets[0]
    if kind == 'zero-wallet': wallets[0] = bytes(20)
    if kind == 'bad-voter-id': voters[0] = '../outside'
    if kind == 'few-projects': projects, meanings = projects[:1], meanings[:1]
    if kind == 'duplicate-project': projects[1] = projects[0]
    if kind == 'short-meaning': meanings[0] = 'x'
    if kind == 'zero-seats': seats = 0
    if kind == 'too-many-seats': seats = 3
    with pytest.raises(Exception, match=r'\[EXPECTED\]'):
        direct_deploy(str(SOURCE), REPO, voters, wallets, projects, meanings, seats)


@pytest.mark.parametrize('raw', [b'[]', b'not-json', b'\xff', b' '*12001,
    b'{"voter":"amber","voter":"cobalt","statements":["I support every listed project."]}',
    b'{"voter":"cobalt","statements":["I support every listed project."]}',
    b'{"voter":"amber","statements":[]}', b'{"voter":"amber","statements":["short"]}',
    json.dumps({'voter':'amber','statements':['x'*601]}).encode(),
    json.dumps({'voter':'amber','statements':['x'*20], 'extra': True}).encode()])
def test_invalid_committed_source_is_atomic_and_retryable(election, direct_vm, raw):
    with direct_vm.expect_revert():
        election.cast(*mocks(direct_vm, CASES[0], 0, raw=raw))
    assert election.get_state()['ballots'] == []
    election.cast(*mocks(direct_vm, CASES[0], 0))
    assert len(election.get_state()['ballots']) == 1


@pytest.mark.parametrize('status', [404, 429, 500, 503])
def test_http_failure_no_ballot(election, direct_vm, status):
    with direct_vm.expect_revert():
        election.cast(*mocks(direct_vm, CASES[0], 0, http=status))
    assert election.get_state()['ballots'] == []


@pytest.mark.parametrize('shape', [None, [], {}, {'choices': []}, {'choices': [True]*4},
    {'choices': [{'project': p, 'vote': 'YES', 'anchors': [0]} for p in CASES[0]['projects']]},
    {'choices': [{'project': p, 'vote': 'APPROVE', 'anchors': [True]} for p in CASES[0]['projects']]},
    {'choices': [{'project': p, 'vote': 'APPROVE', 'anchors': []} for p in CASES[0]['projects']]},
    {'choices': [{'project': p, 'vote': 'APPROVE', 'anchors': [99]} for p in CASES[0]['projects']]}])
def test_malformed_model_output_no_ballot(election, direct_vm, shape):
    # Explicit JSON null needs a dedicated mock since None is the helper default.
    args = mocks(direct_vm, CASES[0], 0, override=shape)
    if shape is None:
        direct_vm.clear_mocks()
        body = (ROOT / 'ballots/representation-amber.json').read_bytes()
        direct_vm.mock_web(re.escape(args[0]), {'status': 200, 'body': body})
        direct_vm.mock_llm(r'.*EQUALPURSE-EXTRACT.*', 'null')
    with direct_vm.expect_revert():
        election.cast(*args)
    assert election.get_state()['ballots'] == []


@pytest.mark.parametrize('index', range(4))
def test_validator_rejects_any_changed_consequential_vote(election, direct_vm, index):
    election.cast(*mocks(direct_vm, CASES[0], 0))
    votes = CASES[0]['votes'][0].copy()
    votes[index] = 'UNKNOWN'
    mocks(direct_vm, CASES[0], 0, votes=votes)
    assert direct_vm.run_validator() is False


@pytest.mark.parametrize('audit', [{'votes_correct':False,'anchors_support':True},
    {'votes_correct':True,'anchors_support':False}, {'votes_correct':1,'anchors_support':True},
    {'votes_correct':'true','anchors_support':True}, {'votes_correct':True}, []])
def test_validator_checks_full_source_audit(election, direct_vm, audit):
    election.cast(*mocks(direct_vm, CASES[0], 0))
    mocks(direct_vm, CASES[0], 0, audit=audit)
    assert direct_vm.run_validator() is False


def test_validator_rechecks_bytes(election, direct_vm):
    election.cast(*mocks(direct_vm, CASES[0], 0))
    mocks(direct_vm, CASES[0], 0, raw=b'{"voter":"amber","statements":["Different externally fetched content."]}')
    assert direct_vm.run_validator() is False


@pytest.mark.parametrize('kind', ['branch', 'foreign', 'path', 'digest'])
def test_reject_unpinned_or_foreign_ballots(election, direct_vm, kind):
    url, digest = mocks(direct_vm, CASES[0], 0)
    if kind == 'branch': url = url.replace('a'*40, 'main')
    if kind == 'foreign': url = url.replace(REPO, 'somebody/equal-purse')
    if kind == 'path': url = url.replace('/ballots/', '/other/')
    if kind == 'digest': digest = 'A'*64
    with direct_vm.expect_revert('Commit-pinned'):
        election.cast(url, digest)


def functions():
    tree = ast.parse(SOURCE.read_text())
    definitions = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ('rational','price','select_committee')]
    namespace = {'Fraction': F, 'fail': lambda message: pytest.fail(message)}
    exec(compile(ast.Module(body=definitions, type_ignores=[]), '<selection>', 'exec'), namespace)
    return namespace


def independent_cap(balances, supporters, cost):
    # Enumerate all possible saturated payer sets rather than production's sorted sweep.
    caps = []
    for mask in range(1 << len(supporters)):
        small = [supporters[i] for i in range(len(supporters)) if mask >> i & 1]
        active = [i for i in supporters if i not in small]
        if not active:
            continue
        rho = (F(cost) - sum((balances[i] for i in small), F(0))) / len(active)
        if rho >= 0 and all(balances[i] <= rho for i in small) and all(balances[i] >= rho for i in active):
            caps.append(rho)
    return min(caps) if caps else None


def test_1536_small_approval_elections_against_independent_cap_oracle():
    core = functions()
    projects = [{'id': x} for x in ('a','b','c')]
    for bits in itertools.product((False, True), repeat=9):
        for seats in (1, 2, 3):
            ballots = [{'voter': str(i), 'choices':[{'project':str(j), 'vote':'APPROVE' if bits[3*i+j] else 'REJECT'} for j in range(3)]} for i in range(3)]
            result = core['select_committee'](projects, ballots, seats)
            balances, selected = [F(seats)]*3, []
            for step in result['steps']:
                offers = []
                for j, p in enumerate(projects):
                    if p['id'] in selected: continue
                    supporters = [i for i in range(3) if bits[3*i+j]]
                    rho = independent_cap(balances, supporters, 3)
                    if rho is not None: offers.append((rho, j))
                rho, j = min(offers)
                assert step['project'] == projects[j]['id']
                assert F(*step['cap']) == rho
                pay = [min(b, rho) if bits[3*i+j] else F(0) for i, b in enumerate(balances)]
                assert [F(*x) for x in step['payments']] == pay
                assert sum(pay) == 3
                balances = [b-p for b,p in zip(balances,pay)]
                assert all(b >= 0 for b in balances)
                assert [F(*x) for x in step['remaining']] == balances
                selected.append(projects[j]['id'])
            assert result['winners'] == selected
            assert sum(balances) == 3*(seats-len(selected))
            if len(selected) < seats:
                for j, p in enumerate(projects):
                    if p['id'] not in selected:
                        assert independent_cap(balances, [i for i in range(3) if bits[3*i+j]], 3) is None


def test_fractional_caps_against_512_independent_payer_subset_checks():
    rng, core = random.Random(731), functions()
    for _ in range(512):
        balances = [F(rng.randrange(10), rng.randrange(1,7)) for i in range(6)]
        supporters = [i for i in range(6) if rng.randrange(2)]
        cost = rng.randrange(1,7)
        assert core['price'](supporters, balances, cost) == independent_cap(balances, supporters, cost)
