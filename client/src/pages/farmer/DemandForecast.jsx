import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import api from '../../lib/api';

// All 38 Tamil Nadu districts with their taluks (subdistricts)
const TN_DISTRICTS = {
  'Ariyalur':        ['Ariyalur','Jayankondam','Sendurai','Udayarpalayam'],
  'Chengalpattu':    ['Chengalpattu','Cheyyur','Maduranthakam','Thiruporur','Tambaram'],
  'Chennai':         ['Ambattur','Egmore','Madhavaram','Sholinganallur','Tambaram','Tiruvottiyur'],
  'Coimbatore':      ['Coimbatore North','Coimbatore South','Mettupalayam','Pollachi','Valparai','Sulur'],
  'Cuddalore':       ['Cuddalore','Kattumannarkoil','Kurinjipadi','Panruti','Vriddhachalam','Bhuvanagiri'],
  'Dharmapuri':      ['Dharmapuri','Harur','Palacode','Pennagaram'],
  'Dindigul':        ['Dindigul','Natham','Nilakottai','Oddanchatram','Palani','Vedasandur'],
  'Erode':           ['Erode','Bhavani','Gobichettipalayam','Perundurai','Sathyamangalam'],
  'Kallakurichi':    ['Kallakurichi','Chinnasalem','Sankarapuram','Ulundurpet'],
  'Kancheepuram':    ['Kancheepuram','Uthiramerur','Walajabad'],
  'Kanyakumari':     ['Agastheeswaram','Kalkulam','Killiyoor','Vilavancode'],
  'Karur':           ['Karur','Aravakurichi','Krishnarayapuram','Kulithalai'],
  'Krishnagiri':     ['Krishnagiri','Bargur','Denkanikottai','Hosur','Pochampalli','Uthangarai'],
  'Madurai':         ['Madurai North','Madurai South','Melur','Peraiyur','Thirumangalam','Usilampatti'],
  'Mayiladuthurai':  ['Mayiladuthurai','Kuthalam','Sirkali','Tharangambadi'],
  'Nagapattinam':    ['Nagapattinam','Kilvelur','Thirukkuvalai','Vedaranyam'],
  'Namakkal':        ['Namakkal','Kolli Hills','Kumarapalayam','Rasipuram','Tiruchengode'],
  'Nilgiris':        ['Gudalur','Kotagiri','Ooty','Pandalur'],
  'Perambalur':      ['Perambalur','Alathur','Kunnam','Veppanthattai'],
  'Pudukkottai':     ['Pudukkottai','Alangudi','Aranthangi','Gandharvakottai','Illuppur','Karambakudi','Tirumayam'],
  'Ramanathapuram':  ['Ramanathapuram','Mudukulathur','Paramakudi','Rameswaram','Tiruvadanai'],
  'Ranipet':         ['Ranipet','Arakkonam','Arcot','Nemili','Sholinghur','Walajah'],
  'Salem':           ['Salem','Attur','Edapadi','Mettur','Omalur','Sankagiri','Yercaud'],
  'Sivaganga':       ['Sivaganga','Devakottai','Ilayangudi','Karaikudi','Manamadurai','Tiruppattur'],
  'Tenkasi':         ['Tenkasi','Alangulam','Kadayanallur','Sankarankovil','Shencottah'],
  'Thanjavur':       ['Thanjavur','Kumbakonam','Orathanadu','Papanasam','Pattukkottai','Peravurani','Thiruvaiyaru'],
  'Theni':           ['Theni','Andipatti','Bodinayakanur','Periyakulam','Uthamapalayam'],
  'Thoothukudi':     ['Thoothukudi','Ettayapuram','Kovilpatti','Sathankulam','Srivaikuntam','Tiruchendur','Vilathikulam'],
  'Tiruchirappalli': ['Tiruchirappalli','Lalgudi','Manachanallur','Manapparai','Musiri','Srirangam','Thuraiyur','Tiruverumbur'],
  'Tirunelveli':     ['Tirunelveli','Ambasamudram','Manur','Nanguneri','Palayamkottai','Radhapuram','Tenkasi'],
  'Tirupathur':      ['Tirupathur','Ambur','Jolarpet','Vaniyambadi'],
  'Tiruppur':        ['Tiruppur','Avinashi','Dharapuram','Kangeyam','Madathukulam','Palladam','Udumalaipettai'],
  'Tiruvallur':      ['Tiruvallur','Gummidipoondi','Ponneri','Poonamallee','Tiruttani','Utukottai'],
  'Tiruvannamalai':  ['Tiruvannamalai','Arni','Cheyyar','Chetpet','Polur','Vandavasi'],
  'Tiruvarur':       ['Tiruvarur','Kodavasal','Mannargudi','Nannilam','Needamangalam','Papanasam'],
  'Vellore':         ['Vellore','Gudiyatham','Katpadi','Pernambut','Tirupathur'],
  'Viluppuram':      ['Viluppuram','Gingee','Kallakurichi','Tindivanam','Tirukoilur','Vanur'],
  'Virudhunagar':    ['Virudhunagar','Aruppukkottai','Rajapalayam','Sivakasi','Srivilliputhur','Vembakkottai'],
};

const DISTRICTS = Object.keys(TN_DISTRICTS).sort();
const CROPS = ['Tomato','Onion','Potato','Brinjal','Cabbage','Carrot','Mango','Banana','Rice','Wheat','Turmeric','Chilli','Groundnut','Cotton','Sugarcane','Tapioca','Coconut','Soya Bean'];

const DemandForecast = () => {
  const { user } = useAuthStore();
  const [form, setForm] = useState({ cropName: '', district: user?.district || '', subDistrict: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subDistricts = form.district ? TN_DISTRICTS[form.district] || [] : [];

  const handleDistrictChange = (e) => {
    setForm(f => ({ ...f, district: e.target.value, subDistrict: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/forecast/demand', form);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Forecast failed. Please try again.');
    }
    setLoading(false);
  };

  const demandColors = { HIGH: '#22c55e', VERY_HIGH: '#16a34a', MEDIUM: '#f59e0b', LOW: '#ef4444', VERY_LOW: '#dc2626' };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Demand Forecast</h1>
        <p className="page-subtitle">Understand market demand for your crops</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card p-4">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>🔍 Forecast Demand</h3>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>⚠️ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label-custom">Crop Name *</label>
              <select className="form-control-custom" value={form.cropName} onChange={e => setForm(f => ({ ...f, cropName: e.target.value }))} required>
                <option value="">Select crop</option>
                {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label-custom">District *</label>
              <select className="form-control-custom" value={form.district} onChange={handleDistrictChange} required>
                <option value="">Select district</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {subDistricts.length > 0 && (
              <div className="mb-4">
                <label className="form-label-custom">Subdistrict (Taluk) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — for hyper-local forecast)</span></label>
                <select className="form-control-custom" value={form.subDistrict} onChange={e => setForm(f => ({ ...f, subDistrict: e.target.value }))}>
                  <option value="">All taluks in {form.district}</option>
                  {subDistricts.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <button type="submit" className="btn-primary-custom w-100" disabled={loading}>
              {loading ? '🤖 Analyzing real-time demand...' : '📊 Forecast Demand'}
            </button>
          </form>
        </div>

        {result ? (
          <div className="glass-card p-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: `${demandColors[result.demandLevel]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>📊</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{result.cropName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {result.district}{result.subDistrict ? ` › ${result.subDistrict}` : ''}
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 50, background: `${demandColors[result.demandLevel]}20`, color: demandColors[result.demandLevel], fontWeight: 700, fontSize: '0.875rem' }}>
                  {result.demandLevel} DEMAND
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Demand Score</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: demandColors[result.demandLevel] }}>{result.demandScore}/100</span>
              </div>
              <div className="progress-bar-custom">
                <div className="progress-fill" style={{ width: `${result.demandScore}%` }} />
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>{result.reason}</p>

            {result.targetBuyers?.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>🎯 TARGET BUYERS</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {result.targetBuyers.map(b => <span key={b} style={{ padding: '2px 10px', borderRadius: 50, background: 'var(--primary-pale)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>{b}</span>)}
                </div>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>💡 Recommendations</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} style={{ padding: '0.5rem 0.75rem', background: 'var(--primary-pale)', borderRadius: 8, marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    ✓ {r}
                  </div>
                ))}
              </div>
            )}
            {result.peakDemandMonths?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>📅 PEAK MONTHS</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {result.peakDemandMonths.map(m => <span key={m} style={{ padding: '2px 10px', borderRadius: 50, background: 'var(--primary)', color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>{m}</span>)}
                </div>
              </div>
            )}
            {result.exportPotential !== undefined && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: result.exportPotential ? '#22c55e15' : '#ef444415', color: result.exportPotential ? '#16a34a' : '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                {result.exportPotential ? '✈️ Export potential available via Tamil Nadu ports' : '🏠 Primarily local/domestic market demand'}
              </div>
            )}
            {result.competitorSupply && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Competitor Supply in region: <strong style={{ color: result.competitorSupply === 'LOW' ? '#22c55e' : result.competitorSupply === 'HIGH' ? '#ef4444' : '#f59e0b' }}>{result.competitorSupply}</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-4 d-flex flex-column align-items-center justify-content-center text-center">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
            <h3 style={{ fontWeight: 700 }}>Market Demand Analyzer</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Get AI-powered demand forecasts to understand when and where to sell your crops.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default DemandForecast;