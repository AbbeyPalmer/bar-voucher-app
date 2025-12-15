import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QrCode, Scan, Mail, Plus, Trash2, Check, X, Send, Power, RefreshCw, Search, LogOut, Lock } from 'lucide-react';

const supabase = createClient(
  'https://knrldnqwvacebcfjeqsx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucmxkbnF3dmFjZWJjZmplcXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NzYwMTYsImV4cCI6MjA4MTM1MjAxNn0.a3y5PtLS3_EQuUn5ZkVixAUj1EXMkzEuLgotOC-jgsg'
);

const VoucherApp = () => {
  const [view, setView] = useState('customer');
  const [events, setEvents] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isStaffAuth, setIsStaffAuth] = useState(false);

  const ADMIN_PASSWORD = 'admin123';
  const STAFF_PASSWORD = 'staff123';

  useEffect(() => {
    loadData();
    
    // Check for email in URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      // Auto-switch to customer view if email in URL
      setView('customer');
    }
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

  const handleAdminLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminAuth(true);
      setPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const handleStaffLogin = () => {
    if (password === STAFF_PASSWORD) {
      setIsStaffAuth(true);
      setPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAdminAuth(false);
    setIsStaffAuth(false);
    setView('customer');
  };

  const LoginScreen = ({ onLogin, title }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [localPassword, setLocalPassword] = useState('');
    
    const handleLogin = () => {
      setPassword(localPassword);
      onLogin();
    };
    
    const deleteInactiveVouchers = async () => {
      if (!confirm('Delete all inactive vouchers? This cannot be undone.')) return;
      
      const inactiveVouchers = vouchers.filter(v => !v.active);
      
      for (const voucher of inactiveVouchers) {
        await supabase.from('vouchers').delete().eq('id', voucher.id);
      }
      
      await loadData();
      searchVouchers();
      alert('Deleted ' + inactiveVouchers.length + ' inactive vouchers');
    };

    const deleteVoucher = async (voucherId) => {
      if (!confirm('Delete this voucher? This cannot be undone.')) return;
      
      const { error } = await supabase.from('vouchers').delete().eq('id', voucherId);
      
      if (error) {
        alert('Error deleting voucher: ' + error.message);
        return;
      }
      
      await loadData();
      searchVouchers();
      alert('Voucher deleted');
    };

    return (
      <div className="max-w-md mx-auto p-6 mt-20">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <Lock size={48} className="mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={localPassword}
              onChange={(e) => setLocalPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setPassword(localPassword);
                  onLogin();
                }
              }}
              autoFocus
              className="w-full p-3 border rounded pr-12"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
          >
            Login
          </button>
          <button
            onClick={() => setView('customer')}
            className="w-full mt-2 text-gray-600 hover:text-gray-800"
          >
            Back to Customer View
          </button>
        </div>
      </div>
    );
  };

  const AdminView = () => {
    const [newEvent, setNewEvent] = useState({ name: '', drinks: 2, date: '' });
    const [recipients, setRecipients] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [foundVouchers, setFoundVouchers] = useState([]);
    const [showSearch, setShowSearch] = useState(true);

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
      
      if (!emails.length) {
        alert('Please enter at least one email address');
        return;
      }
      
      const newVouchers = emails.map(email => ({
        id: eventId + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        event_id: eventId,
        event_name: event.name,
        email: email.trim().toLowerCase(),
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

      try {
        await fetch('/api/send-vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vouchers: newVouchers })
        });
        alert('Generated and emailed ' + newVouchers.length + ' vouchers!');
      } catch (e) {
        alert('Vouchers created but email not configured. Generated ' + newVouchers.length + ' vouchers.');
      }

      await loadData();
      setRecipients('');
    };

    const deleteEvent = async (eventId) => {
      if (!confirm('Delete this event and all its vouchers?')) return;
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

      // Deactivate old voucher
      const { error: deactivateError } = await supabase
        .from('vouchers')
        .update({ 
          active: false, 
          replaced_by: newVoucher.id 
        })
        .eq('id', oldVoucher.id);

      if (deactivateError) {
        alert('Error deactivating old voucher: ' + deactivateError.message);
        return;
      }
      
      // Create new voucher
      const { error: insertError } = await supabase
        .from('vouchers')
        .insert([newVoucher]);

      if (insertError) {
        alert('Error creating new voucher: ' + insertError.message);
        return;
      }

      // Send email with new voucher
      try {
        await fetch('/api/send-vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vouchers: [newVoucher] })
        });
      } catch (e) {
        console.log('Email not sent:', e);
      }
      
      await loadData();
      searchVouchers();
      alert('New voucher created and sent! ID: ' + newVoucher.id);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Event Management</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Change passwords in the code! Current defaults are 'admin123' and 'staff123'
          </p>
        </div>
        
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Search & Manage Vouchers</h2>
            <button
              onClick={deleteInactiveVouchers}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete Inactive
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="Search by email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchVouchers()}
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
                      <p className="text-xs text-gray-500 font-mono break-all">{voucher.id}</p>
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
          {searchEmail && foundVouchers.length === 0 && (
            <p className="text-gray-500 text-center py-4">No vouchers found for this email</p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Events</h2>
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

    useEffect(() => {
      // Pre-fill email from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
        // Auto-lookup vouchers
        lookupVouchersWithEmail(emailParam);
      }
    }, []);

    const lookupVouchersWithEmail = async (emailToLookup) => {
      if (!emailToLookup.trim()) {
        alert('Please enter your email');
        return;
      }
      
      const { data } = await supabase
        .from('vouchers')
        .select('*')
        .eq('email', emailToLookup.toLowerCase().trim())
        .eq('active', true);
      
      setCustomerVouchers(data || []);
      
      if (!data || data.length === 0) {
        alert('No vouchers found for this email');
      }
    };

    const lookupVouchers = () => lookupVouchersWithEmail(email);

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
            onKeyPress={(e) => e.key === 'Enter' && lookupVouchers()}
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
                  <p className="text-xs text-gray-600 font-mono break-all mb-3">{voucher.id}</p>
                  <button
                    onClick={() => {
                      // Create a canvas to generate QR code
                      const canvas = document.createElement('canvas');
                      const size = 400;
                      canvas.width = size;
                      canvas.height = size;
                      const ctx = canvas.getContext('2d');
                      
                      // White background
                      ctx.fillStyle = 'white';
                      ctx.fillRect(0, 0, size, size);
                      
                      // Simple QR-like pattern (just visual - you'd use a real QR library for production)
                      ctx.fillStyle = 'black';
                      ctx.font = 'bold 16px monospace';
                      ctx.textAlign = 'center';
                      ctx.fillText('VOUCHER CODE:', size/2, 30);
                      ctx.font = '12px monospace';
                      const lines = voucher.id.match(/.{1,30}/g) || [];
                      lines.forEach((line, i) => {
                        ctx.fillText(line, size/2, 60 + (i * 20));
                      });
                      
                      // Download
                      canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'voucher-' + voucher.event_name.replace(/\s+/g, '-') + '.png';
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                  >
                    Download QR Code
                  </button>
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
      
      if (!scannedCode.trim()) {
        setScanResult({ success: false, message: 'Please enter a voucher ID' });
        return;
      }
      
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Scan Voucher</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
        
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
            onKeyPress={(e) => e.key === 'Enter' && redeemVoucher()}
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

  if (view === 'admin' && !isAdminAuth) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-gray-800 text-white p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Bar Voucher System</h1>
            <button
              onClick={() => setView('customer')}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
            >
              Customer View
            </button>
          </div>
        </nav>
        <LoginScreen onLogin={handleAdminLogin} title="Admin Login" />
      </div>
    );
  }

  if (view === 'scanner' && !isStaffAuth) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-gray-800 text-white p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Bar Voucher System</h1>
            <button
              onClick={() => setView('customer')}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
            >
              Customer View
            </button>
          </div>
        </nav>
        <LoginScreen onLogin={handleStaffLogin} title="Staff Login" />
      </div>
    );
  }

  // If customer view is accessed directly (no auth needed)
  if (view === 'customer') {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-gray-800 text-white p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Bar Voucher System</h1>
            <div className="space-x-2">
              <button
                onClick={() => setView('admin')}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              >
                Admin
              </button>
              <button
                onClick={() => setView('scanner')}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              >
                Scanner
              </button>
            </div>
          </div>
        </nav>
        <div className="py-8">
          <CustomerView />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Bar Voucher System</h1>
          <div className="space-x-2">
            {(isAdminAuth || isStaffAuth) ? (
              <>
                {isAdminAuth && (
                  <button
                    onClick={() => setView('admin')}
                    className={view === 'admin' ? 'px-4 py-2 rounded bg-blue-600' : 'px-4 py-2 rounded bg-gray-700'}
                  >
                    Admin
                  </button>
                )}
                <button
                  onClick={() => setView('customer')}
                  className={view === 'customer' ? 'px-4 py-2 rounded bg-blue-600' : 'px-4 py-2 rounded bg-gray-700'}
                >
                  Customer
                </button>
                {isStaffAuth && (
                  <button
                    onClick={() => setView('scanner')}
                    className={view === 'scanner' ? 'px-4 py-2 rounded bg-blue-600' : 'px-4 py-2 rounded bg-gray-700'}
                  >
                    Scanner
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setView('admin')}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
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
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  Scanner
                </button>
              </>
            )}
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