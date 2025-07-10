import React, { useState, useEffect } from 'react'
import { Phone, Mail, Globe, MapPin, Users, Building, ExternalLink, Copy, CheckCircle, Edit3, Save, X, Plus, Trash2 } from 'lucide-react'
import { supabase, type TriviaProvider } from '../lib/supabase'
import { useAuth } from '../context/auth_context'

interface ContactInfo {
  emails?: string[]
  phones?: string[]
  address?: string
  location?: string
  website?: string
  note?: string
  demo_booking?: string
  support?: string
  social?: any
}

const ProviderContactsPage: React.FC = () => {
  const { userProfile } = useAuth()
  const [providers, setProviders] = useState<TriviaProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [editingContact, setEditingContact] = useState<ContactInfo>({})

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('trivia_providers')
        .select('*')
        .order('name')

      if (error) throw error
      setProviders(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(`${label}: ${text}`)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const parseContactInfo = (contactInfo: any): ContactInfo => {
    if (!contactInfo) return {}
    if (typeof contactInfo === 'string') {
      try {
        return JSON.parse(contactInfo)
      } catch {
        return {}
      }
    }
    return contactInfo
  }

  const getContactStatus = (provider: TriviaProvider) => {
    const contact = parseContactInfo((provider as any).contact_info)
    if (contact.emails?.length) return { status: 'Complete', color: 'text-green-600', icon: CheckCircle }
    if (contact.phones?.length) return { status: 'Phone Only', color: 'text-yellow-600', icon: Phone }
    if (contact.note?.includes('research needed')) return { status: 'Research Needed', color: 'text-red-600', icon: Users }
    return { status: 'No Contact', color: 'text-gray-500', icon: Building }
  }

  const startEditing = (provider: TriviaProvider) => {
    setEditingProvider(provider.id)
    setEditingContact(parseContactInfo((provider as any).contact_info))
  }

  const cancelEditing = () => {
    setEditingProvider(null)
    setEditingContact({})
  }

  const saveContact = async (providerId: string) => {
    try {
      const { error } = await supabase
        .from('trivia_providers')
        .update({ contact_info: editingContact })
        .eq('id', providerId)

      if (error) throw error

      // Update local state
      setProviders(prev => prev.map(p => 
        p.id === providerId 
          ? { ...p, contact_info: editingContact }
          : p
      ))
      
      setEditingProvider(null)
      setEditingContact({})
    } catch (err: any) {
      setError(err.message)
    }
  }

  const addEmail = () => {
    setEditingContact(prev => ({
      ...prev,
      emails: [...(prev.emails || []), '']
    }))
  }

  const updateEmail = (index: number, value: string) => {
    setEditingContact(prev => ({
      ...prev,
      emails: prev.emails?.map((email, i) => i === index ? value : email)
    }))
  }

  const removeEmail = (index: number) => {
    setEditingContact(prev => ({
      ...prev,
      emails: prev.emails?.filter((_, i) => i !== index)
    }))
  }

  const addPhone = () => {
    setEditingContact(prev => ({
      ...prev,
      phones: [...(prev.phones || []), '']
    }))
  }

  const updatePhone = (index: number, value: string) => {
    setEditingContact(prev => ({
      ...prev,
      phones: prev.phones?.map((phone, i) => i === index ? value : phone)
    }))
  }

  const removePhone = (index: number) => {
    setEditingContact(prev => ({
      ...prev,
      phones: prev.phones?.filter((_, i) => i !== index)
    }))
  }

  const updateField = (field: keyof ContactInfo, value: string) => {
    setEditingContact(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Only show for platform_admin
  if (userProfile?.role !== 'platform_admin') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This page is only accessible to platform administrators.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Trivia Provider Contacts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete contact directory for business outreach and partnerships
        </p>
        {copiedText && (
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-green-800 dark:text-green-200 text-sm">
              ✓ Copied: {copiedText}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {providers.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Providers</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {providers.filter(p => parseContactInfo((p as any).contact_info).emails?.length).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">With Email</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-yellow-600">
            {providers.filter(p => parseContactInfo((p as any).contact_info).phones?.length).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">With Phone</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-red-600">
            {providers.filter(p => parseContactInfo((p as any).contact_info).note?.includes('research needed')).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Need Research</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((provider) => {
          const contact = parseContactInfo((provider as any).contact_info)
          const statusInfo = getContactStatus(provider)
          const StatusIcon = statusInfo.icon
          const isEditing = editingProvider === provider.id

          return (
            <div key={provider.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {provider.name}
                  </h3>
                  <div className={`flex items-center gap-2 ${statusInfo.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{statusInfo.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.website && (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      <Globe className="w-4 h-4" />
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveContact(provider.id)}
                        className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(provider)}
                      className="p-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    {/* Edit Emails */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email Contacts
                          </span>
                        </div>
                        <button
                          onClick={addEmail}
                          className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 ml-6">
                        {(editingContact.emails || []).map((email, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => updateEmail(index, e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="email@company.com"
                            />
                            <button
                              onClick={() => removeEmail(index)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edit Phones */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Phone Numbers
                          </span>
                        </div>
                        <button
                          onClick={addPhone}
                          className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 ml-6">
                        {(editingContact.phones || []).map((phone, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => updatePhone(index, e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="(555) 123-4567"
                            />
                            <button
                              onClick={() => removePhone(index)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edit Address */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Address
                        </span>
                      </div>
                      <div className="ml-6">
                        <input
                          type="text"
                          value={editingContact.address || ''}
                          onChange={(e) => updateField('address', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Company address"
                        />
                      </div>
                    </div>

                    {/* Edit Notes */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Notes
                        </span>
                      </div>
                      <div className="ml-6">
                        <textarea
                          value={editingContact.note || ''}
                          onChange={(e) => updateField('note', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          rows={3}
                          placeholder="Research notes, contact status, etc."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="space-y-3">
                    {/* Emails */}
                    {contact.emails && contact.emails.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email Contacts
                          </span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {contact.emails.map((email, index) => (
                            <div key={index} className="flex items-center justify-between group">
                              <a
                                href={`mailto:${email}`}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 text-sm"
                              >
                                {email}
                              </a>
                              <button
                                onClick={() => copyToClipboard(email, 'Email')}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phones */}
                    {contact.phones && contact.phones.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Phone Numbers
                          </span>
                        </div>
                        <div className="space-y-1 ml-6">
                          {contact.phones.map((phone, index) => (
                            <div key={index} className="flex items-center justify-between group">
                              <a
                                href={`tel:${phone}`}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 text-sm"
                              >
                                {phone}
                              </a>
                              <button
                                onClick={() => copyToClipboard(phone, 'Phone')}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    {contact.address && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Address
                          </span>
                        </div>
                        <div className="ml-6 text-sm text-gray-600 dark:text-gray-400">
                          {contact.address}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {contact.note && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          📝 {contact.note}
                        </p>
                      </div>
                    )}

                    {/* Show empty state for providers with no contact info */}
                    {!contact.emails?.length && !contact.phones?.length && !contact.address && !contact.note && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Building className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No contact information yet</p>
                        <p className="text-xs">Click the edit button to add details</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProviderContactsPage