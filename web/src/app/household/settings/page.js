'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';

export default function HouseholdSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [invites, setInvites] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberDetails, setMemberDetails] = useState({});
  const [currentUserRole, setCurrentUserRole] = useState('member');
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [copiedToken, setCopiedToken] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [qrCodeUrls, setQrCodeUrls] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Generate QR codes for all invites
    invites.forEach(invite => {
      const url = `${window.location.origin}/household/setup?invite=${invite.token}`;
      QRCode.toDataURL(url, { width: 200, margin: 1 })
        .then(dataUrl => {
          setQrCodeUrls(prev => ({ ...prev, [invite.id]: dataUrl }));
        })
        .catch(err => console.error('Error generating QR code:', err));
    });
  }, [invites]);

  const fetchData = async () => {
    try {
      // Fetch members
      const membersRes = await fetch('/api/household/members');
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
        
        // Fetch user details for all members
        if (membersData.members && membersData.members.length > 0) {
          const userIds = membersData.members.map(m => m.user_id);
          const detailsRes = await fetch('/api/users/details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_ids: userIds }),
          });
          
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            const detailsMap = {};
            detailsData.users.forEach(user => {
              detailsMap[user.user_id] = user;
            });
            setMemberDetails(detailsMap);
          }
        }

        // Check current user's role
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const currentMember = membersData.members.find(m => m.user_id === user.id);
          if (currentMember) {
            setCurrentUserRole(currentMember.role);
          }
        }
      }

      // Fetch invites
      await fetchInvites();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/household/invites');
      if (!res.ok) {
        if (res.status === 403) {
          setError('Only household owners can manage invites');
          return;
        }
        throw new Error('Failed to fetch invites');
      }
      const data = await res.json();
      setInvites(data.invites || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    try {
      const res = await fetch('/api/household/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, new_role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      await fetchData();
      alert('Role updated successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const removeMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from the household?`)) return;

    try {
      const res = await fetch('/api/household/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      await fetchData();
      alert('Member removed successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const generateInvite = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/household/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, expires_days: 7 }),
      });


  const sendEmailInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSendingEmail(true);
    setError('');

    try {
      const res = await fetch('/api/household/invites/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: selectedRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send invite');
      }

      const data = await res.json();
      alert(data.message || 'Invite sent!');
      setInviteEmail('');
      setShowEmailForm(false);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingEmail(false);
    }
  };
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate invite');
      }

      await fetchInvites();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const revokeInvite = async (inviteId) => {
    if (!confirm('Revoke this invite link?')) return;

    try {
      const res = await fetch(`/api/household/invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to revoke invite');
      }

      await fetchInvites();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyInviteLink = (token) => {
    const url = `${window.location.origin}/household/setup?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Household Settings</h1>
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Household Members Section */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Household Members</h2>
            
            {members.length === 0 ? (
              <p className="text-sm text-gray-500">No members found</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const details = memberDetails[member.user_id] || {};
                  const isOwner = member.role === 'owner';
                  const canManage = currentUserRole === 'owner' && !isOwner;
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {details.display_name?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {details.display_name || 'Loading...'}
                            </h3>
                            <p className="text-sm text-gray-600">{details.email || 'Loading...'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {canManage ? (
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.id, e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                          >
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                            <option value="owner">Owner</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium capitalize ${
                            isOwner 
                              ? 'bg-purple-100 text-purple-800' 
                              : member.role === 'member'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.role}
                            {isOwner && ' 👑'}
                          </span>
                        )}
                        
                        {canManage && (
                          <button
                            onClick={() => removeMember(member.id, details.display_name)}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md"
                            title="Remove member"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Roles:</strong>
                <span className="ml-2">👑 <strong>Owner</strong> - Full control</span>
                <span className="ml-3">📝 <strong>Member</strong> - Can view and edit calendars</span>
                <span className="ml-3">👁️ <strong>Viewer</strong> - Can only view calendars</span>
              </p>
            </div>
          </div>

          {/* Generate Invite Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Invite Family Members</h2>
            <p className="text-sm text-gray-600 mb-4">
              Create a shareable link or send an email invitation. Links expire after 7 days.
            </p>

            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="member">Member - Can view and edit calendars</option>
                    <option value="viewer">Viewer - Can only view calendars</option>
                  </select>
                </div>
                <button
                  onClick={generateInvite}
                  disabled={generating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {generating ? 'Generating...' : 'Generate Link'}
                </button>
                <button
                  onClick={() => setShowEmailForm(!showEmailForm)}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
                >
                  Send Email
                </button>
              </div>

              {showEmailForm && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium mb-3">Send Invite via Email</h3>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="recipient@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={sendEmailInvite}
                      disabled={sendingEmail}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {sendingEmail ? 'Sending...' : 'Send'}
                    </button>
                    <button
                      onClick={() => {
                        setShowEmailForm(false);
                        setInviteEmail('');
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    📧 An email invitation will be sent to the recipient with a link to join your household.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Active Invites List */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Invite Links</h2>
            
            {invites.length === 0 ? (
              <p className="text-sm text-gray-500">No active invites</p>
            ) : (
              <div className="space-y-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex gap-4">
                      {/* QR Code */}
                      <div className="flex-shrink-0">
                        {qrCodeUrls[invite.id] ? (
                          <div className="border-2 border-gray-200 rounded-lg p-2 bg-white">
                            <img 
                              src={qrCodeUrls[invite.id]} 
                              alt="QR Code" 
                              className="w-32 h-32"
                            />
                            <p className="text-xs text-center text-gray-500 mt-1">Scan to join</p>
                          </div>
                        ) : (
                          <div className="w-32 h-32 bg-gray-100 rounded animate-pulse"></div>
                        )}
                      </div>

                      {/* Invite Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {invite.role}
                          </span>
                          {copiedToken === invite.token && (
                            <span className="text-xs text-green-600">✓ Copied!</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Expires: {formatDate(invite.expires_at)}
                        </p>
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Shareable Link:</p>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all block">
                            {window.location.origin}/household/setup?invite={invite.token}
                          </code>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyInviteLink(invite.token)}
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md"
                          >
                            📋 Copy Link
                          </button>
                          <button
                            onClick={() => revokeInvite(invite.id)}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md"
                          >
                            🗑️ Revoke
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
