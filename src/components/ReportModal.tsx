import React, { useState, useEffect } from 'react';
import { X, Flag, CheckCircle, ShieldAlert, AlertTriangle, FileText, UserCheck, Scale, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CopyrightClaimData } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'video' | 'user' | 'comment' | 'copyright';
  targetId: string;
  targetPreview?: string;
  initialMode?: 'standard' | 'copyright';
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetPreview,
  initialMode = 'standard',
}) => {
  const { currentUser, openAuthModal } = useAuth();

  // Mode: 'standard' or 'copyright'
  const [reportMode, setReportMode] = useState<'standard' | 'copyright'>('standard');

  // Standard Report State
  const [reason, setReason] = useState<string>('Inappropriate / Adult Content');
  const [details, setDetails] = useState<string>('');

  // Copyright Report Form State
  const [claimType, setClaimType] = useState<CopyrightClaimData['claimType']>('unlicensed_music');
  const [originalWorkTitle, setOriginalWorkTitle] = useState<string>('');
  const [originalWorkUrl, setOriginalWorkUrl] = useState<string>('');
  const [claimantName, setClaimantName] = useState<string>('');
  const [claimantEmail, setClaimantEmail] = useState<string>('');
  const [claimantOrganization, setClaimantOrganization] = useState<string>('');
  const [relationshipToOwner, setRelationshipToOwner] = useState<CopyrightClaimData['relationshipToOwner']>('owner');
  const [infringementTimestamp, setInfringementTimestamp] = useState<string>('');
  const [copyrightDescription, setCopyrightDescription] = useState<string>('');
  const [legalDeclarationConfirmed, setLegalDeclarationConfirmed] = useState<boolean>(false);

  // Status & Validation
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [claimId, setClaimId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setSubmitting(false);
      setFormError('');
      if (targetType === 'copyright' || initialMode === 'copyright') {
        setReportMode('copyright');
      } else {
        setReportMode('standard');
      }
      if (currentUser) {
        setClaimantName(currentUser.displayName || currentUser.username);
        setClaimantEmail(currentUser.email || '');
      }
    }
  }, [isOpen, targetType, initialMode, currentUser]);

  const standardReasons = [
    'Inappropriate / Adult Content',
    'Harassment or Hate Speech',
    'Spam or Misleading Info',
    'Dangerous Acts / Self-Harm',
    'Copyright or Trademark Infringement',
    'Other Safety Concern',
  ];

  const copyrightReasons = [
    {
      type: 'unlicensed_music' as const,
      label: 'Unlicensed Audio / Music Track',
      desc: 'Use of copyrighted song, sound recording, or studio audio master without sync rights.',
    },
    {
      type: 'video_reupload' as const,
      label: 'Stolen Full Video Re-upload',
      desc: 'Exact or near-exact re-upload of your original video post without permission.',
    },
    {
      type: 'footage_clip' as const,
      label: 'Uncredited B-Roll / Footage Clip',
      desc: 'Incorporation of video clips, drone shots, or cinematography filmed by you.',
    },
    {
      type: 'artwork_logo' as const,
      label: 'Logo / Artwork / Trademark Infringement',
      desc: 'Unauthorized display of registered visual artwork, brand logo, or protected assets.',
    },
    {
      type: 'other' as const,
      label: 'Other Copyright Infringement',
      desc: 'Any other proprietary intellectual property used without authorization.',
    },
  ];

  if (!isOpen) return null;

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }

    // If user clicked "Copyright or Trademark Infringement" in standard, suggest switching to dedicated copyright form
    if (reason === 'Copyright or Trademark Infringement' && reportMode === 'standard') {
      setReportMode('copyright');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          type: targetType === 'copyright' ? 'video' : targetType,
          targetId,
          targetPreview,
          reason,
          details,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setClaimId(data.report?.id || '');
        setSubmitted(true);
      } else {
        setFormError('Failed to submit report. Please try again.');
      }
    } catch {
      setFormError('Network error submitting report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyrightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }

    // Form Validations
    if (!originalWorkTitle.trim()) {
      setFormError('Please specify the title or name of the original copyrighted work.');
      return;
    }
    if (!copyrightDescription.trim()) {
      setFormError('Please provide a detailed description explaining the infringement.');
      return;
    }
    if (!claimantName.trim()) {
      setFormError('Please provide your full legal name or authorized claimant name.');
      return;
    }
    if (!claimantEmail.trim() || !claimantEmail.includes('@')) {
      setFormError('Please provide a valid contact email for legal correspondence.');
      return;
    }
    if (!legalDeclarationConfirmed) {
      setFormError('You must confirm the legal truthfulness declaration before submitting a copyright notice.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const copyrightData: CopyrightClaimData = {
      claimType,
      originalWorkTitle: originalWorkTitle.trim(),
      originalWorkUrl: originalWorkUrl.trim() || undefined,
      claimantName: claimantName.trim(),
      claimantEmail: claimantEmail.trim(),
      claimantOrganization: claimantOrganization.trim() || undefined,
      relationshipToOwner,
      legalDeclarationConfirmed: true,
      infringementTimestamp: infringementTimestamp.trim() || undefined,
      notes: copyrightDescription.trim(),
    };

    const claimReasonLabel =
      copyrightReasons.find(r => r.type === claimType)?.label || 'Copyright Infringement';

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          type: 'copyright',
          targetId,
          targetPreview: targetPreview || 'Video ID: ' + targetId,
          reason: `Copyright Claim: ${claimReasonLabel} - "${originalWorkTitle}"`,
          details: copyrightDescription.trim(),
          copyrightData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setClaimId(data.report?.id || '');
        setSubmitted(true);
      } else {
        const d = await res.json();
        setFormError(d.error || 'Failed to submit copyright claim.');
      }
    } catch {
      setFormError('Network error submitting copyright claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="report-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="report-modal-container"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 text-white shadow-2xl animate-fade-in my-auto max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 shrink-0 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            {reportMode === 'copyright' ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <Flag className="h-4 w-4" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold">
                {reportMode === 'copyright' ? 'Copyright Infringement Claim' : `Report ${targetType}`}
              </h3>
              <p className="text-[10px] text-zinc-400">
                {reportMode === 'copyright'
                  ? 'Submit formal DMCA / intellectual property notice'
                  : 'Report community guidelines and safety violations'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-report-modal-btn"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selector Tabs (if target is video or general) */}
        {!submitted && (
          <div className="flex border-b border-white/10 bg-zinc-950/60 p-1 shrink-0">
            <button
              type="button"
              id="report-tab-standard"
              onClick={() => {
                setReportMode('standard');
                setFormError('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                reportMode === 'standard'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flag className="h-3 w-3 text-rose-400" />
              <span>Community Report</span>
            </button>
            <button
              type="button"
              id="report-tab-copyright"
              onClick={() => {
                setReportMode('copyright');
                setFormError('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                reportMode === 'copyright'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              <ShieldAlert className="h-3 w-3 text-amber-400" />
              <span>Copyright Claim (DMCA)</span>
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {formError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  {reportMode === 'copyright' ? 'Copyright Claim Submitted for Review' : 'Report Received'}
                </h4>
                {claimId && <p className="text-[11px] font-mono text-zinc-400">Reference ID: {claimId}</p>}
              </div>

              <div className="rounded-xl bg-zinc-800/80 p-3 text-xs text-zinc-300 border border-white/5 max-w-sm mx-auto text-left space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
                  <Scale className="h-3.5 w-3.5 shrink-0" />
                  <span>Administrative Review Process</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {reportMode === 'copyright'
                    ? 'Our moderation and safety team will inspect the reported video, examine the claimed original work, and contact the creator or rights holder if additional legal verification is needed.'
                    : 'Thank you for keeping TikTok safe. Our moderation team has received your report and will take action according to platform safety policies.'}
                </p>
              </div>

              <button
                type="button"
                id="report-done-btn"
                onClick={onClose}
                className="mt-2 rounded-xl bg-zinc-800 px-8 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          ) : reportMode === 'copyright' ? (
            /* ========================================================
               COPYRIGHT CLAIM FORM (Comprehensive DMCA / IP Reporting)
               ======================================================== */
            <form onSubmit={handleCopyrightSubmit} className="space-y-4 text-xs">
              {/* Target Video Information */}
              {targetPreview && (
                <div className="rounded-xl bg-zinc-800/80 p-3 border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    Target Video Under Claim
                  </span>
                  <p className="text-xs text-zinc-200 font-medium line-clamp-2">{targetPreview}</p>
                </div>
              )}

              {/* 1. Reason / Type of Copyright Infringement */}
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-300">
                  1. Reason for Copyright Claim <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {copyrightReasons.map(r => (
                    <label
                      key={r.type}
                      className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all ${
                        claimType === r.type
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-white/10 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="copyrightClaimType"
                        value={r.type}
                        checked={claimType === r.type}
                        onChange={() => setClaimType(r.type)}
                        className="mt-0.5 text-amber-500 focus:ring-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold block text-zinc-200">{r.label}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">{r.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Original Work Information */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <label className="block font-bold text-zinc-300">
                  2. Your Copyrighted Work Details <span className="text-rose-400">*</span>
                </label>

                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">
                    Title / Identification of Original Work <span className="text-rose-400">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={originalWorkTitle}
                    onChange={e => setOriginalWorkTitle(e.target.value)}
                    placeholder="e.g. Song Title, Master Film Name, Original Video Title"
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Original URL / Proof Link</span>
                    <input
                      type="url"
                      value={originalWorkUrl}
                      onChange={e => setOriginalWorkUrl(e.target.value)}
                      placeholder="https://example.com/original-work"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Timestamp in Video (Optional)</span>
                    <input
                      type="text"
                      value={infringementTimestamp}
                      onChange={e => setInfringementTimestamp(e.target.value)}
                      placeholder="e.g. 0:05 - 0:15"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">
                    Description of Infringement <span className="text-rose-400">*</span>
                  </span>
                  <textarea
                    required
                    rows={3}
                    value={copyrightDescription}
                    onChange={e => setCopyrightDescription(e.target.value)}
                    placeholder="Explain in detail how the reported video infringes your copyrighted work..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* 3. Reporter / Claimant Contact Information */}
              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-zinc-300">
                    3. Claimant Contact Information <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-emerald-400" />
                    Admin Protected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">
                      Full Legal Name <span className="text-rose-400">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      value={claimantName}
                      onChange={e => setClaimantName(e.target.value)}
                      placeholder="Full Legal Name"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">
                      Contact Email <span className="text-rose-400">*</span>
                    </span>
                    <input
                      type="email"
                      required
                      value={claimantEmail}
                      onChange={e => setClaimantEmail(e.target.value)}
                      placeholder="legal@yourdomain.com"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Company / Organization</span>
                    <input
                      type="text"
                      value={claimantOrganization}
                      onChange={e => setClaimantOrganization(e.target.value)}
                      placeholder="e.g. Media Production LLC"
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">
                      Relationship to Owner <span className="text-rose-400">*</span>
                    </span>
                    <select
                      value={relationshipToOwner}
                      onChange={e =>
                        setRelationshipToOwner(e.target.value as CopyrightClaimData['relationshipToOwner'])
                      }
                      className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="owner">Direct Copyright Owner</option>
                      <option value="authorized_agent">Authorized Licensing Agent</option>
                      <option value="legal_representative">Legal Counsel / Representative</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Truthfulness & Legal Declaration Checkbox */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="copyright-legal-confirmation-checkbox"
                    checked={legalDeclarationConfirmed}
                    onChange={e => setLegalDeclarationConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-zinc-800 text-amber-500 focus:ring-0"
                  />
                  <div className="space-y-1">
                    <span className="font-bold text-amber-300 block text-[11px]">
                      Declaration of Truthfulness & Authority <span className="text-rose-400">*</span>
                    </span>
                    <p className="text-[10px] text-zinc-300 leading-relaxed">
                      I declare under penalty of perjury that I am the copyright owner or authorized to act on behalf
                      of the owner, and that all information provided in this notice is accurate and truthful. I
                      understand that false statements may incur legal liabilities.
                    </p>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-copyright-report-btn"
                  disabled={submitting || !legalDeclarationConfirmed}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting ? 'Submitting Notice...' : 'Submit Copyright Claim'}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================
               STANDARD COMMUNITY REPORT FORM
               ======================================================== */
            <form onSubmit={handleStandardSubmit} className="space-y-4">
              {targetPreview && (
                <div className="rounded-xl bg-zinc-800/80 p-3 text-xs text-zinc-300 border border-white/5 line-clamp-2">
                  <span className="font-semibold text-zinc-400">Target: </span>
                  {targetPreview}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Why are you reporting this {targetType}?
                </label>
                <div className="space-y-1.5">
                  {standardReasons.map(r => (
                    <label
                      key={r}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-xs cursor-pointer transition-colors ${
                        reason === r
                          ? 'border-rose-500 bg-rose-500/10 text-white'
                          : 'border-white/10 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="reportReason"
                          value={r}
                          checked={reason === r}
                          onChange={() => {
                            setReason(r);
                            if (r === 'Copyright or Trademark Infringement') {
                              setReportMode('copyright');
                            }
                          }}
                          className="text-rose-500 focus:ring-0"
                        />
                        <span>{r}</span>
                      </div>
                      {r === 'Copyright or Trademark Infringement' && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                          DMCA Form
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Provide extra context to help our moderation team..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-standard-report-btn"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
