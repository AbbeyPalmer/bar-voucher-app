import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QrCode, Scan, Mail, Plus, Trash2, Check, X, Send, Power, RefreshCw, Search } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  'https://knrldnqwvacebcfjeqsx.supabase.co', // Replace with your Supabase URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucmxkbnF3dmFjZWJjZmplcXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NzYwMTYsImV4cCI6MjA4MTM1MjAxNn0.a3y5PtLS3_EQuUn5ZkVixAUj1EXMkzEuLgotOC-jgsg' // Replace with your anon key
);

const VoucherApp = () => {
  const [view, setView] = useState('admin');
  const [events, setEvents] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('created', { ascending: false });
      
      const { data: vouchersData } = await supabase
        .from('vouchers')
        .select('*')
        .order('created', { ascending: false });
      
      if (eventsData) setEvents(eventsData);
      if (vouchersData) setVouchers(vouchersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const AdminView = () => {
    const [newEvent, setNewEvent] = useState({ name: '', drinks: 2, date: '' });
    const [recipients, setRecipients] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [foundVouchers, setFoundVouchers] = useState([]);

    const createEvent = async () => {
      if (!newEvent.name || !newEvent.drinks || !newEvent.date) return;
      
      const event = {
        id: Date.now().toString(),
        name: newEvent.name,
        drinks: newEvent.drinks,
        date: newEvent.date
      };
      
      const { error } = await supabase.from('events').insert([event]);
      
      if (error) {
        alert('Error creating event: ' + error.message);
        return;
      }
      
      await loadData();
      setNewEvent({ name: '', drinks: 2, date: '' });
    };

    const generateVouchers = async (eventId) => {
      const emails = recipients.split('\n').filter(e => e.trim());
      const event = events.find(e => e.id === eventId);
      
      const newVouchers = emails.map(email => ({
        id: eventId + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        event_id: eventId,
        event_name: event.name,
        email: email.trim(),
        total_drinks: event.drinks,
        remaining: event.drinks,
        used: [],
        active: true
      }));

      const { error } = await supabase.from('vouchers').insert(newVouchers);
      
      if (error) {
        alert('Error generating vouchers: ' + error.message);
        return;
      }

      // Send emails via your backend API
      try {
        await fetch('/api/send-vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vouchers: newVouchers })
        });
      } catch (e) {
        console.log('Email sending not configured yet');
      }

      await loadData();
      setRecipients('');
      alert('Generated ' + newVouchers.length + ' vouchers!');
    };

    const deleteEvent = async (eventId) => {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (!error) await loadData();
    };

    const searchVouchers = async () => {
      if (!searchEmail.trim()) {
        setFoundVouchers([]);
        return;
      }
      
      const { data } = await supabase
        .from('vouchers')
        .select('*')
        .ilike('email', '%' + searchEmail + '%');
      
      setFoundVouchers(data || []);
    };

    const toggleVoucherStatus = async (voucherId, currentStatus) => {
      const { error } = await supabase
        .from('vouchers')
        .update({ active: !currentStatus })
        .eq('id', voucherId);
      
      if (!error) {
        await loadData();
        searchVouchers();
      }
    };

    const createReplacementVoucher = async (oldVoucher) => {
      const newVoucher = {
        id: oldVoucher.event_id + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        event_id: oldVoucher.event_id,
        event_name: oldVoucher.event_name,
        email: oldVoucher.email,
        total_drinks: oldVoucher.total_drinks,
        remaining: oldVoucher.total_drinks,
        used: [],
        active: true,
        replacement_for: oldVoucher.id
      };

      // Deactivate old voucher and create new one
      await supabase.from('vouchers').update({ 
        active: false, 
        replaced_by: newVoucher.id 
      }).eq('id', oldVoucher.id);
      
      await supabase.from('vouchers').insert([newVoucher]);
      
      await loadData();
      searchVouchers();
      alert('New voucher created! ID: ' + newVoucher.id);
    };

    const resendVoucher = async (voucher) => {
      try {
        await fetch('/api/send-vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vouchers: [voucher] })
        });
        alert('Voucher resent to ' + voucher.email);
      } catch (e) {
        alert('Email sending not configured. Voucher ID: ' + voucher.id);
      }
    };

    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Event Management</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Event Name"
              value={newEvent.name}
              onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Drinks per Person"
              value={newEvent.drinks}
              onChange={(e) => setNewEvent({...newEvent, drinks: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
            />
            <input
              type="date"
              value={newEvent.date}
              onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
              className="w-full p-2 border rounded"
            />
            <button
              onClick={createEvent}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Plus className="inline mr-2" size={20} />
              Create Event
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Search & Manage Vouchers</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="Search by email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={searchVouchers}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <Search size={20} />
            </button>
          </div>

          {foundVouchers.length > 0 && (
            <div className="space-y-3">
              {foundVouchers.map(voucher => (
                <div key={voucher.id} className={voucher.active ? 'border rounded p-4 bg-white' : 'border rounded p-4 bg-gray-100'}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{voucher.event_name}</h4>
                      <p className="text-sm text-gray-600">{voucher.email}</p>
                      <p className="text-xs text-gray-500 font-mono">{voucher.id}</p>
                      <p className="text-sm mt-1">
                        {voucher.remaining} of {voucher.total_drinks} drinks remaining
                      </p>
                    </div>
                    <span className={voucher.active ? 'text-green-600 text-sm font-semibold' : 'text-red-600 text-sm font-semibold'}>
                      {voucher.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => toggleVoucherStatus(voucher.id, voucher.active)}
                      className={voucher.active ? 'flex-1 bg-yellow-600 text-white px-3 py-2 rounded hover:bg-yellow-700 text-sm' : 'flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm'}
                    >
                      <Power size={16} className="inline mr-1" />
                      {voucher.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => resendVoucher(voucher)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      <Mail size={16} className="inline mr-1" />
                      Resend
                    </button>
                    <button
                      onClick={() => createReplacementVoucher(voucher)}
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-sm"
                    >
                      <RefreshCw size={16} className="inline mr-1" />
                      Replace
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{event.name}</h3>
                  <p className="text-gray-600">{event.date} • {event.drinks} drinks each</p>
                  <p className="text-sm text-gray-500">
                    {vouchers.filter(v => v.event_id === event.id && v.active).length} active vouchers
                  </p>
                </div>
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              <div className="space-y-2">
                <textarea
                  placeholder="Enter email addresses (one per line)"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full p-2 border rounded h-24"
                />
                <button
                  onClick={() => generateVouchers(event.id)}
                  className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  <Mail className="inline mr-2" size={20} />
                  Generate Vouchers
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CustomerView = () => {
    const [email, setEmail] = useState('');
    const [customerVouchers, setCustomerVouchers] = useState([]);
    const [shareEmail, setShareEmail] = useState('');
    const [sharingVoucher, setSharingVoucher] = useState(null);

    const lookupVouchers = async () => {
      const { data } = await supabase
        .from('vouchers')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('active', true);
      
      setCustomerVouchers(data || []);
    };

    const shareVoucher = async (voucher) => {
      if (!shareEmail.trim()) {
        alert('Please enter an email address');
        return;
      }

      const { error } = await supabase
        .from('vouchers')
        .update({
          email: shareEmail.trim().toLowerCase(),
          shared_from: voucher.email,
          shared_at: new Date().toISOString()
        })
        .eq('id', voucher.id);

      if (error) {
        alert('Error sharing voucher: ' + error.message);
        return;
      }

      alert('Voucher shared with ' + shareEmail + '!');
      setSharingVoucher(null);
      setShareEmail('');
      lookupVouchers();
    };

    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">My Vouchers</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <button
            onClick={lookupVouchers}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Find My Vouchers
          </button>
        </div>

        <div className="space-y-4">
          {customerVouchers.map(voucher => (
            <div key={voucher.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold">{voucher.event_name}</h3>
                {voucher.shared_from && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Shared with you
                  </span>
                )}
              </div>
              
              <div className="flex justify-center my-4 bg-gray-100 p-4 rounded">
                <div className="text-center">
                  <QrCode size={120} className="mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-mono break-all">{voucher.id}</p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded mb-4">
                <p className="text-lg font-semibold">
                  {voucher.remaining} of {voucher.total_drinks} drinks remaining
                </p>
                {voucher.used && voucher.used.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-semibold">Used:</p>
                    {voucher.used.map((use, idx) => (
                      <p key={idx}>• {new Date(use.timestamp).toLocaleString()}</p>
                    ))}
                  </div>
                )}
              </div>

              {sharingVoucher === voucher.id ? (
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Friend's email address"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => shareVoucher(voucher)}
                      className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                    >
                      <Send size={16} className="inline mr-1" />
                      Share
                    </button>
                    <button
                      onClick={() => {
                        setSharingVoucher(null);
                        setShareEmail('');
                      }}
                      className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSharingVoucher(voucher.id)}
                  className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                >
                  <Send size={16} className="inline mr-1" />
                  Share with Friend
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ScannerView = () => {
    const redeemVoucher = async () => {
      setScanResult(null);
      
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', scannedCode.trim())
        .single();
      
      if (!voucher) {
        setScanResult({ success: false, message: 'Voucher not found' });
        return;
      }

      if (!voucher.active) {
        setScanResult({ success: false, message: 'Voucher has been deactivated' });
        return;
      }

      if (voucher.remaining <= 0) {
        setScanResult({ success: false, message: 'No drinks remaining' });
        return;
      }

      const updatedUsed = [...(voucher.used || []), { timestamp: new Date().toISOString() }];
      
      const { error } = await supabase
        .from('vouchers')
        .update({
          remaining: voucher.remaining - 1,
          used: updatedUsed
        })
        .eq('id', voucher.id);

      if (error) {
        setScanResult({ success: false, message: 'Error redeeming voucher' });
        return;
      }

      await loadData();

      setScanResult({ 
        success: true, 
        message: 'Drink redeemed!',
        remaining: voucher.remaining - 1,
        eventName: voucher.event_name
      });
      setScannedCode('');
    };

    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Scan Voucher</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center mb-6">
            <Scan size={80} className="mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Scan QR code or enter voucher ID manually</p>
          </div>
          
          <input
            type="text"
            placeholder="Voucher ID"
            value={scannedCode}
            onChange={(e) => setScannedCode(e.target.value)}
            className="w-full p-3 border-2 rounded mb-4 font-mono"
          />
          
          <button
            onClick={redeemVoucher}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 text-lg font-semibold disabled:bg-gray-400"
          >
            Redeem Drink
          </button>
        </div>

        {scanResult && (
          <div className={scanResult.success ? 'bg-green-100 rounded-lg p-6' : 'bg-red-100 rounded-lg p-6'}>
            <div className="flex items-center mb-2">
              {scanResult.success ? (
                <Check size={32} className="text-green-600 mr-2" />
              ) : (
                <X size={32} className="text-red-600 mr-2" />
              )}
              <h3 className="text-xl font-bold">{scanResult.message}</h3>
            </div>
            {scanResult.success && (
              <div>
                <p className="text-lg">{scanResult.eventName}</p>
                <p className="text-2xl font-bold mt-2">{scanResult.remaining} drinks remaining</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Quick Stats</h3>
          <p>Total active vouchers: {vouchers.filter(v => v.active).length}</p>
          <p>Total drinks remaining: {vouchers.filter(v => v.active).reduce((sum, v) => sum + v.remaining, 0)}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Bar Voucher System</h1>
          <div className="space-x-2">
            <button
              onClick={() => setView('admin')}
              className={view === 'admin' ? 'px-4 py-2 rounded bg-blue-600' : 'px-4 py-2 rounded bg-gray-700'}
            >
              Admin
            </button>
            <button
              onClick={() => setView('customer')}
              className={view === 'customer' ? 'px-4 py-2 rounded bg-blue-600' : 'px-4 py-2 rounded bg-gray-700'}
            >
              Customer
            </button>
            <button
              onClick={() => setView('scanner')}
              className={view === 'scanner' ? 'px-4 py-2 rounded bg-blue-600' : 'px-4 py-2 rounded bg-gray-700'}
            >
              Scanner
            </button>
          </div>
        </div>
      </nav>

      <div className="py-8">
        {loading && <div className="text-center text-gray-600">Loading...</div>}
        {view === 'admin' && <AdminView />}
        {view === 'customer' && <CustomerView />}
        {view === 'scanner' && <ScannerView />}
      </div>
    </div>
  );
};

export default VoucherApp;