import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { TAMIL_NADU_LOCATIONS } from '../../lib/locationData';

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: searchParams.get('role') || 'BUYER',
    phone: '', district: '', subDistrict: '', village: '',
    state: 'Tamil Nadu',
    latitude: null, longitude: null
  });
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Reset sub-district and village if district changes
  useEffect(() => {
    setForm(f => ({ ...f, subDistrict: '', village: '' }));
  }, [form.district]);

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setLocationMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          // Use Nominatim reverse geocoding with proper headers
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=en`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;

            // Nominatim fields for Tamil Nadu:
            // state_district → District, county → District (fallback)
            // suburb / city_district / town / village / hamlet → locality
            // state → State name

            const stateName = addr.state || 'Tamil Nadu';

            // --- Detect District ---
            // Nominatim uses "state_district" or "county" for district in India
            const rawDistrict = addr.state_district || addr.county || addr.city || '';
            let detectedDistrict = '';

            // Try exact match first (case-insensitive)
            const districtKeys = Object.keys(TAMIL_NADU_LOCATIONS);
            for (const d of districtKeys) {
              if (rawDistrict.toLowerCase().includes(d.toLowerCase()) ||
                  d.toLowerCase().includes(rawDistrict.toLowerCase())) {
                detectedDistrict = d;
                break;
              }
            }

            // Fallback: search all address fields for any known district
            if (!detectedDistrict) {
              const allAddrText = Object.values(addr).join(' ').toLowerCase();
              for (const d of districtKeys) {
                if (allAddrText.includes(d.toLowerCase())) {
                  detectedDistrict = d;
                  break;
                }
              }
            }

            // --- Detect Sub-district / Taluk ---
            // Nominatim uses "suburb", "city_district", "county" or "municipality"
            const rawSubDistrict =
              addr.suburb || addr.city_district || addr.municipality ||
              addr.county || addr.town || addr.village || '';

            let detectedSubDistrict = '';
            if (detectedDistrict) {
              const taluks = TAMIL_NADU_LOCATIONS[detectedDistrict] || [];
              for (const t of taluks) {
                if (rawSubDistrict.toLowerCase().includes(t.toLowerCase()) ||
                    t.toLowerCase().includes(rawSubDistrict.toLowerCase())) {
                  detectedSubDistrict = t;
                  break;
                }
              }

              // Fallback: search full address for any known taluk
              if (!detectedSubDistrict) {
                const allAddrText = Object.values(addr).join(' ').toLowerCase();
                for (const t of taluks) {
                  if (allAddrText.includes(t.toLowerCase())) {
                    detectedSubDistrict = t;
                    break;
                  }
                }
              }

              // Last resort: pick first taluk of the district
              if (!detectedSubDistrict) {
                detectedSubDistrict = taluks[0] || '';
              }
            }

            // --- Detect Village / Locality ---
            // Prioritize the actual village name first
            const detectedVillage =
              addr.village || addr.hamlet || addr.suburb ||
              addr.neighbourhood || addr.quarter || addr.town || '';

            setForm(f => ({
              ...f,
              state: stateName,
              district: detectedDistrict || f.district,
              subDistrict: detectedSubDistrict || f.subDistrict,
              village: detectedVillage || f.village,
              latitude,
              longitude
            }));

            const accuracyText = accuracy < 50
              ? '✅ High accuracy'
              : accuracy < 200
              ? '⚠️ Moderate accuracy'
              : '❌ Low accuracy';
            setLocationMsg(`${accuracyText} (±${Math.round(accuracy)}m) — ${data.display_name?.split(',').slice(0, 3).join(', ')}`);
          }
        } catch (err) {
          console.error('Geocoding failed:', err);
          setLocationMsg('⚠️ Could not resolve address. Coordinates saved.');
          setForm(f => ({ ...f, latitude, longitude }));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        let msg = '';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission denied. Please allow location access in your browser settings and try again.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable. Please try again.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Please try again.';
            break;
          default:
            msg = `Location error: ${err.message}`;
        }
        alert(msg);
      },
      {
        enableHighAccuracy: true,   // Request GPS-level accuracy
        timeout: 15000,             // Wait up to 15s
        maximumAge: 0               // Always get fresh location
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    let cleanPhone = form.phone ? form.phone.trim() : '';
    if (cleanPhone) {
      cleanPhone = cleanPhone.replace(/[\s\-\+\(\)]/g, '');
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.slice(2);
      } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = cleanPhone.slice(1);
      }
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return setError('Phone number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210).');
      }
    }

    try {
      const { user } = await register({
        name: form.name, email: form.email, password: form.password,
        role: form.role, phone: cleanPhone || undefined,
        district: form.district,
        subDistrict: form.subDistrict || undefined,
        state: form.state,
        village: form.village,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined
      });
      const paths = { FARMER: '/farmer', BUYER: '/buyer', ADMIN: '/admin' };
      navigate(paths[user.role] || '/');
    } catch (err) {
      setError(err.message);
    }
  };

  const taluks = form.district ? TAMIL_NADU_LOCATIONS[form.district] || [] : [];

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem' }}>
      <div className="glass-card p-5" style={{ width: '100%', maxWidth: 520 }}>
        <div className="text-center mb-4">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌱</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Join the AI Farmer Marketplace</p>
        </div>

        {/* Role Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[{ value: 'FARMER', icon: '👨‍🌾', label: 'Farmer' }, { value: 'BUYER', icon: '🛒', label: 'Buyer' }].map(r => (
            <button key={r.value} type="button"
              onClick={() => setForm(f => ({ ...f, role: r.value }))}
              style={{
                padding: '0.75rem', borderRadius: 'var(--radius-md)', border: `2px solid ${form.role === r.value ? 'var(--primary)' : 'var(--border)'}`,
                background: form.role === r.value ? 'var(--primary-pale)' : 'transparent',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                color: form.role === r.value ? 'var(--primary)' : 'var(--text-secondary)'
              }}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label-custom">Full Name *</label>
              <input className="form-control-custom" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="col-12">
              <label className="form-label-custom">Email Address *</label>
              <input type="email" className="form-control-custom" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="col-sm-6">
              <label className="form-label-custom">Password *</label>
              <input type="password" className="form-control-custom" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="col-sm-6">
              <label className="form-label-custom">Confirm Password *</label>
              <input type="password" className="form-control-custom" placeholder="Repeat password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
            </div>
            <div className="col-sm-6">
              <label className="form-label-custom">Phone <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(Optional, 10 digits)</span></label>
              <input className="form-control-custom" placeholder="e.g. 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>

            <div className="col-sm-6">
              <label className="form-label-custom">District *</label>
              <select className="form-control-custom" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} required>
                <option value="">Select district</option>
                {Object.keys(TAMIL_NADU_LOCATIONS).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {form.role === 'FARMER' && (
              <>
                <div className="col-12">
                  <label className="form-label-custom">Sub-district / Taluk *</label>
                  <select
                    className="form-control-custom"
                    value={form.subDistrict}
                    onChange={e => setForm(f => ({ ...f, subDistrict: e.target.value }))}
                    required
                    disabled={!form.district}
                  >
                    <option value="">Select sub-district / taluk</option>
                    {taluks.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label-custom">Village *</label>
                  <input
                    className="form-control-custom"
                    placeholder="Enter your village name"
                    value={form.village}
                    onChange={e => setForm(f => ({ ...f, village: e.target.value }))}
                    required
                  />
                </div>

                {/* Fetch Live Location */}
                <div className="col-12">
                  <button
                    type="button"
                    onClick={handleLiveLocation}
                    disabled={locating}
                    style={{
                      width: '100%', padding: '10px 16px', fontSize: '0.875rem',
                      background: locating ? 'var(--border)' : 'var(--gradient-primary)',
                      color: 'white', border: 'none', borderRadius: 8,
                      cursor: locating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 8, fontWeight: 600, transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>📍</span>
                    {locating ? 'Detecting your location…' : 'Auto-fill via Live Location'}
                  </button>
                  {locationMsg && (
                    <p style={{
                      marginTop: '0.5rem', fontSize: '0.78rem',
                      color: locationMsg.startsWith('✅') ? '#16a34a' : locationMsg.startsWith('⚠️') ? '#d97706' : '#dc2626',
                      textAlign: 'center'
                    }}>
                      {locationMsg}
                    </p>
                  )}
                  {(form.latitude && form.longitude) && (
                    <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      📌 {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <button id="register-btn" type="submit" className="btn-primary-custom w-100 mt-4" disabled={isLoading}>
            {isLoading ? '⏳ Creating account...' : `🌱 Register as ${form.role === 'FARMER' ? 'Farmer' : 'Buyer'}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600, color: 'var(--primary)' }}>Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
