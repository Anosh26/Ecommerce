'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useCart();

  const [authFailures, setAuthFailures] = useState({ offline: false, latency: 0 });
  const [paymentFailures, setPaymentFailures] = useState({ offline: false, latency: 0, fail_charge: false });
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Read failure configurations and DB sync metrics from the Gateway
  const fetchFailures = async () => {
    try {
      const authRes = await fetch('http://localhost:5000/api/auth/failures').catch(() => null);
      if (authRes && authRes.ok) {
        const authData = await authRes.json();
        setAuthFailures(authData);
      }

      const paymentRes = await fetch('http://localhost:5000/api/payment/failures').catch(() => null);
      if (paymentRes && paymentRes.ok) {
        const paymentData = await paymentRes.json();
        setPaymentFailures(paymentData);
      }

      const syncRes = await fetch('http://localhost:5000/api/sync/status').catch(() => null);
      if (syncRes && syncRes.ok) {
        const syncData = await syncRes.json();
        setSyncStatus(syncData.metrics);
      }

      setIsLoaded(true);
    } catch (err: any) {
      console.error('Failed to connect to gateway endpoints:', err);
      setIsLoaded(true);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('http://localhost:5000/api/sync/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus(data.metrics);
        showFeedback('Cross-Database Synchronization completed across all 4 mini DBs!', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showFeedback(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchFailures();
      const interval = setInterval(() => {
        fetch('http://localhost:5000/api/sync/status')
          .then(r => r.json())
          .then(d => setSyncStatus(d.metrics))
          .catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setIsLoaded(true);
    }
  }, [user]);

  const handleSaveAuth = async (offlineVal: boolean, latencyVal: number) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/configure-failures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offline: offlineVal, latency: latencyVal })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthFailures(data.failures);
        showFeedback('Auth Service failures updated successfully!', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showFeedback(`Failed to update Auth Service: ${err.message}`, 'error');
    }
  };

  const handleSavePayment = async (offlineVal: boolean, latencyVal: number, failChargeVal: boolean) => {
    try {
      const res = await fetch('http://localhost:5000/api/payment/configure-failures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offline: offlineVal, latency: latencyVal, fail_charge: failChargeVal })
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentFailures(data.failures);
        showFeedback('Payment Gateway failures updated successfully!', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showFeedback(`Failed to update Payment Service: ${err.message}`, 'error');
    }
  };

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  if (!isLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Loading Resiliency Console...</h2>
      </div>
    );
  }

  // Access Restriction
  if (!user || user.role !== 'admin') {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '550px',
          margin: '0 auto',
          padding: '3rem 2rem',
          border: '3px solid #1e293b',
          borderRadius: '20px',
          background: '#ffffff',
          boxShadow: '6px 6px 0px #1e293b'
        }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ef4444', marginBottom: '1.25rem' }}>Access Denied</h2>
          <p style={{ color: '#4b5563', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
            The page you are trying to access is restricted to <strong>Store Administrators</strong>. Please log in with an administrator account to view resiliency dials and inject service faults.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/login" className="btn" style={{ background: '#facc15', color: '#1e293b', border: '2px solid #1e293b', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, boxShadow: '3px 3px 0px #1e293b' }}>
              Log In as Admin
            </Link>
            <Link href="/" className="btn" style={{ background: '#ffffff', color: '#1e293b', border: '2px solid #1e293b', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, boxShadow: '3px 3px 0px #1e293b' }}>
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      {/* Dashboard Heading */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#1e293b', marginBottom: '0.5rem' }}>
          Resiliency Control Center ⚙️
        </h1>
        <p style={{ color: '#4b5563', fontSize: '1.1rem', fontWeight: 500 }}>
          Inject microservice faults, simulate offline states, and test transaction database rollbacks.
        </p>
      </div>

      {/* Global alert notifications */}
      {message && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 2rem auto',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `2.5px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: message.type === 'success' ? '#14532d' : '#991b1b',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          fontSize: '0.95rem',
          fontWeight: 700,
          boxShadow: '3px 3px 0px #1e293b',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          {message.text}
        </div>
      )}

      {/* Control Cards Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '2.5rem',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        
        {/* Auth Service Failure Card */}
        <div style={{
          background: '#ffffff',
          border: '3px solid #1e293b',
          borderRadius: '16px',
          boxShadow: '6px 6px 0px #1e293b',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
                Offline Auth Service
              </h2>
              <span style={{
                background: authFailures.offline ? '#fee2e2' : '#dcfce7',
                color: authFailures.offline ? '#b91c1c' : '#15803d',
                border: `2px solid ${authFailures.offline ? '#ef4444' : '#22c55e'}`,
                borderRadius: '20px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: 800
              }}>
                {authFailures.offline ? 'SIMULATED OFFLINE' : 'HEALTHY'}
              </span>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              Simulates authentication server crashes or unreachability. When offline, all logins, registrations, and token verifications will return a simulated 503 error.
            </p>

            {/* Offline Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Offline Mode</span>
              <input 
                type="checkbox" 
                checked={authFailures.offline} 
                onChange={(e) => setAuthFailures(prev => ({ ...prev, offline: e.target.checked }))}
                style={{ width: '22px', height: '22px', cursor: 'pointer' }}
              />
            </div>

            {/* Latency Slider */}
            <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                <span>Simulated Latency</span>
                <span style={{ color: '#d97706' }}>{authFailures.latency} ms</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10000" 
                step="500" 
                value={authFailures.latency}
                onChange={(e) => setAuthFailures(prev => ({ ...prev, latency: parseInt(e.target.value) }))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                Delays auth processing to test frontend load states.
              </span>
            </div>

            <button
              onClick={() => handleSaveAuth(authFailures.offline, authFailures.latency)}
              style={{
                width: '100%',
                background: '#1e293b',
                color: '#ffffff',
                border: '3px solid #1e293b',
                borderRadius: '8px',
                padding: '0.75rem',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '3px 3px 0px #d97706',
                transition: 'all 0.15s ease',
                marginTop: '1rem'
              }}
            >
              Apply Auth Settings
            </button>
          </div>
        </div>

        {/* Payment Service Failure Card */}
        <div style={{
          background: '#ffffff',
          border: '3px solid #1e293b',
          borderRadius: '16px',
          boxShadow: '6px 6px 0px #1e293b',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
                Payment Gateway API
              </h2>
              <span style={{
                background: paymentFailures.offline ? '#fee2e2' : '#dcfce7',
                color: paymentFailures.offline ? '#b91c1c' : '#15803d',
                border: `2px solid ${paymentFailures.offline ? '#ef4444' : '#22c55e'}`,
                borderRadius: '20px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: 800
              }}>
                {paymentFailures.offline ? 'OFFLINE' : 'ONLINE'}
              </span>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              Simulates card processor outages. Inject network cuts or force charge transactions to fail to check database ACID transaction rollbacks.
            </p>

            {/* Offline Toggle (Loss of internet) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block' }}>Loss of Internet</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Forces gateway connection timeout (503).</span>
              </div>
              <input 
                type="checkbox" 
                checked={paymentFailures.offline} 
                onChange={(e) => setPaymentFailures(prev => ({ ...prev, offline: e.target.checked }))}
                style={{ width: '22px', height: '22px', cursor: 'pointer' }}
              />
            </div>

            {/* Transaction Decline Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block' }}>Simulate Card Decline</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Declines all charge requests (402).</span>
              </div>
              <input 
                type="checkbox" 
                checked={paymentFailures.fail_charge} 
                onChange={(e) => setPaymentFailures(prev => ({ ...prev, fail_charge: e.target.checked }))}
                style={{ width: '22px', height: '22px', cursor: 'pointer' }}
              />
            </div>

            {/* Latency Slider */}
            <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                <span>Simulated Latency</span>
                <span style={{ color: '#d97706' }}>{paymentFailures.latency} ms</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10000" 
                step="500" 
                value={paymentFailures.latency}
                onChange={(e) => setPaymentFailures(prev => ({ ...prev, latency: parseInt(e.target.value) }))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <button
              onClick={() => handleSavePayment(paymentFailures.offline, paymentFailures.latency, paymentFailures.fail_charge)}
              style={{
                width: '100%',
                background: '#1e293b',
                color: '#ffffff',
                border: '3px solid #1e293b',
                borderRadius: '8px',
                padding: '0.75rem',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '3px 3px 0px #d97706',
                transition: 'all 0.15s ease',
                marginTop: '1rem'
              }}
            >
              Apply Payment Settings
            </button>
          </div>
        </div>

      </div>

      {/* Database Synchronization Status Panel */}
      <div style={{
        maxWidth: '1000px',
        margin: '2.5rem auto 0 auto',
        background: '#ffffff',
        border: '3px solid #1e293b',
        borderRadius: '16px',
        boxShadow: '6px 6px 0px #1e293b',
        padding: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                Cross-Database Synchronization Engine 🔄
              </h2>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                border: '2px solid #22c55e',
                borderRadius: '20px',
                padding: '0.2rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                Auto-Sync Active (5s)
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Continuously synchronizes data between isolated mini-databases across all 4 microservice VMs.
            </p>
          </div>
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            style={{
              background: syncing ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              border: '2px solid #1e293b',
              borderRadius: '8px',
              padding: '0.6rem 1.2rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: syncing ? 'not-allowed' : 'pointer',
              boxShadow: '3px 3px 0px #1e293b',
              transition: 'all 0.15s ease'
            }}
          >
            {syncing ? 'Syncing Now...' : '⚡ Trigger Manual Sync'}
          </button>
        </div>

        {/* 4 Mini DB Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>VM 1: AUTH DB</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>paaptol_auth</div>
            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginTop: '0.4rem' }}>
              ● {syncStatus?.syncedUsers ?? 2} Users Synced
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>VM 2: CATALOG DB</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>paaptol_search</div>
            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginTop: '0.4rem' }}>
              ● {syncStatus?.syncedProducts ?? 6} Products Synced
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>VM 3: CART DB</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>paaptol_cart</div>
            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginTop: '0.4rem' }}>
              ● User & Catalog Replicas OK
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#f8fafc', border: '2px solid #1e293b', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>VM 4: ORDER DB</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginTop: '0.25rem' }}>paaptol_order</div>
            <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, marginTop: '0.4rem' }}>
              ● {syncStatus?.syncedOrders ?? 0} Orders Reconciled
            </div>
          </div>
        </div>

        {/* Sync Cycle Metainfo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div><strong>Total Sync Cycles:</strong> {syncStatus?.totalCycles ?? 'Active'}</div>
          <div><strong>Last Synchronized:</strong> {syncStatus?.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleTimeString() : 'Recently'}</div>
          <div><strong>Cross-VM Sync Ring:</strong> Connected (Private VPC)</div>
        </div>
      </div>

      {/* Info Warning Footer */}
      <div style={{
        maxWidth: '1000px',
        margin: '3rem auto 0 auto',
        padding: '1.25rem',
        background: '#fffbeb',
        border: '2px solid #f59e0b',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'start',
        gap: '0.75rem'
      }}>
        <span style={{ fontSize: '1.25rem' }}>💡</span>
        <div style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: '1.5' }}>
          <strong>Resilience testing info:</strong> Try putting the Payment Gateway offline, add items to your cart, and click check out. Stock levels are decremented <em>before</em> the payment step. Because of the failure, the Buy microservice will automatically roll back stock levels inside the Search database and abort writing the order record, showing a clean system rollback!
        </div>
      </div>
    </div>
  );
}
