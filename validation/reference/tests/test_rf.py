"""EM closed forms vs scikit-rf media and structural S-parameter checks."""

import math

import numpy as np
import pytest
import skrf
from scipy.special import ellipk

from apref import rf

F = skrf.Frequency(1, 10, 10, unit="MHz")  # quasi-static band for the media models


@pytest.mark.parametrize("k", [1e-4, 0.1, 0.5, 0.9, 0.999999])
def test_agm_vs_scipy(k):
    assert rf.ellipk_agm(k) == pytest.approx(ellipk(k * k), rel=1e-13)


@pytest.mark.parametrize("w,h,er", [(0.1e-3, 0.1e-3, 3.3), (0.3e-3, 0.1e-3, 4.5), (30e-6, 100e-6, 11.9), (2e-3, 0.5e-3, 2.2)])
def test_microstrip_hj_vs_skrf(w, h, er):
    own = rf.microstrip_hj(w, h, er)
    m = skrf.media.MLine(F, w=w, h=h, t=None, ep_r=er, model="hammerstadjensen", disp="none", diel="frequencyinvariant",
                         rho=None, tand=0, compatibility_mode=None)
    assert np.real(m.ep_reff_f[0]) == pytest.approx(own["eps_eff"], rel=1e-6)
    assert np.real(m.z0_characteristic[0]) == pytest.approx(own["z0_ohm"], rel=1e-6)


def test_microstrip_hj_known_point():
    # w/h = 1, er = 1: Z01 = 126.5 ohm (Hammerstad-Jensen air line, own evaluation of the closed form); 50-ohm sanity:
    # er 4.5 needs w/h about 1.9 (textbook FR4 rule of thumb, 1.6 mm -> 3 mm)
    assert rf.microstrip_hj(1.0, 1.0, 1.0)["z0_ohm"] == pytest.approx(126.5, abs=0.5)
    assert rf.microstrip_hj(1.9, 1.0, 4.5)["z0_ohm"] == pytest.approx(50.0, abs=1.5)


@pytest.mark.parametrize("w,s,h,er", [(50e-6, 30e-6, 500e-6, 11.9), (10e-6, 6e-6, 200e-6, 3.3), (0.6e-3, 0.3e-3, 1.55e-3, 4.5)])
def test_cpw_vs_skrf(w, s, h, er):
    own = rf.cpw_conformal(w, s, h, er)
    m = skrf.media.CPW(F, w=w, s=s, h=h, ep_r=er, t=None, rho=None, tand=0, diel="frequencyinvariant", has_metal_backside=False)
    # scikit-rf uses the Hilberg approximation of K/K' (stated max error about 2 ppm); own = exact AGM
    assert np.real(m.ep_reff_f[0]) == pytest.approx(own["eps_eff"], rel=1e-5)
    assert np.real(m.z0_characteristic[0]) == pytest.approx(own["z0_ohm"], rel=1e-5)


def test_cpw_thick_substrate_limit():
    # h -> inf: eps_eff -> (er + 1) / 2 (Wen 1969)
    assert rf.cpw_conformal(10e-6, 5e-6, 10.0, 11.9)["eps_eff"] == pytest.approx(6.45, rel=1e-9)


def test_stripline_limits():
    # wide strip -> two parallel plates of spacing b/2: Z0 -> eta0 b / (4 w sqrt(er)) plus fringing; Cohn closed form
    # for w/b -> inf: 30 pi / (sqrt(er) (w/b + 2 ln2 / pi))
    for wb in (3.0, 6.0):
        z = rf.stripline_cohn(wb, 1.0, 4.0)
        assert z == pytest.approx(rf.ETA0 / 4 / (2.0 * (wb + 2 * math.log(2) / math.pi)), rel=1e-6)


def test_coax_vs_skrf():
    a, b, er = 0.5e-3, 1.75e-3, 2.1
    m = skrf.media.Coaxial(F, Dint=2 * a, Dout=2 * b, epsilon_r=er, tan_delta=0, sigma=1e30)
    assert np.real(m.z0_characteristic[0]) == pytest.approx(rf.coax_z0(a, b, er), rel=1e-4)


def test_te10_vs_skrf():
    a = 22.86e-3
    wg = skrf.media.RectangularWaveguide(skrf.Frequency(8, 12, 3, unit="GHz"), a=a, b=a / 2)
    assert wg.f_cutoff == pytest.approx(rf.te10_cutoff(a), rel=1e-9)


def test_line_s_vs_skrf_and_structure(tmp_path):
    f = np.linspace(1e9, 50e9, 50)
    er, z0 = 3.3, 42.0
    beta = 2 * np.pi * f * math.sqrt(er) / rf.C0
    gamma = 0.5 + 1j * beta  # Np/m loss
    S = rf.line_s(gamma, z0, 2e-3)
    med = skrf.media.DefinedGammaZ0(skrf.Frequency.from_f(f, unit="Hz"), gamma=gamma, z0=z0, z0_port=50)
    ref = med.line(2e-3, unit="m")
    assert np.abs(S - ref.s).max() < 1e-12
    nw = rf.network(f, S)
    assert rf.reciprocity_error(nw) < 1e-14
    assert rf.passivity_margin(nw) < 0
    # cascade of two halves = full; renormalise round trip; Touchstone round trip
    half = rf.network(f, rf.line_s(gamma, z0, 1e-3))
    assert np.abs(rf.cascade(half, half).s - S).max() < 1e-12
    back = rf.renormalize(rf.renormalize(nw, 42.0), 50.0)
    assert np.abs(back.s - S).max() < 1e-12
    rf.write(nw, str(tmp_path / "line"))
    rd = rf.read(str(tmp_path / "line.s2p"))
    assert np.abs(rd.s - S).max() < 1e-6


def test_mixed_mode_uncoupled_pair():
    # two identical uncoupled lines as a 4-port (ports 1,2 = inputs of line a, b; 3,4 = outputs): Sdd21 = Scc21 = S21
    f = np.linspace(1e9, 20e9, 5)
    gamma = 1j * 2 * np.pi * f * math.sqrt(3.3) / rf.C0
    S2 = rf.line_s(gamma, 50.0, 5e-3)
    S4 = np.zeros((f.size, 4, 4), dtype=complex)
    for (i, j), (p, q) in {(0, 0): (0, 0), (0, 1): (0, 2), (1, 0): (2, 0), (1, 1): (2, 2)}.items():
        S4[:, p, q] = S2[:, i, j]
        S4[:, p + 1, q + 1] = S2[:, i, j]
    mm = rf.mixed_mode(rf.network(f, S4), p=2)
    # skrf gmm ordering: [d1, d2, c1, c2]
    assert np.abs(mm.s[:, 1, 0] - S2[:, 1, 0]).max() < 1e-12
    assert np.abs(mm.s[:, 3, 2] - S2[:, 1, 0]).max() < 1e-12
    assert np.abs(mm.s[:, 2, 0]).max() < 1e-12  # no mode conversion
