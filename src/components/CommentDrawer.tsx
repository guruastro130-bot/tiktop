import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, MessageCircle, CornerDownRight, Reply, MoreVertical, UserX, VolumeX, Flag } from 'lucide-react';
import { Comment, Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { BlockConfirmModal } from './BlockConfirmModal';

interface CommentDrawerProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  highlightCommentId?: string;
  onOpenReportUser?: (user: { id: string; username: string }) => void;
}

export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  video,
  isOpen,
  onClose,
  onCommentAdded,
  highlightCommentId,
  onOpenReportUser,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; displayName?: string } | null>(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    isOpen: boolean;
    type: 'block' | 'mute';
    user: { id: string; username: string; displayName?: string; avatarUrl?: string } | null;
  }>({
    isOpen: false,
    type: 'block',
    user: null,
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLDivElement>(null);

  const emojiList = ['❤️', '🔥', '😍', '👏', '😂', '✨', '🙌', '💯'];

  const fetchComments = () => {
    if (!video) return;
    setLoading(true);
    fetch(`/api/videos/${video.id}/comments`, {
      headers: currentUser ? { 'x-user-id': currentUser.id } : {},
    })
      .then(res => res.json())
      .then(data => {
        setComments(data.comments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && video) {
      fetchComments();
    } else {
      setReplyingTo(null);
      setInputText('');
      setOpenMenuCommentId(null);
    }
  }, [isOpen, video, currentUser]);

  useEffect(() => {
    if (!loading && highlightCommentId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, highlightCommentId, comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !video) return;

    if (!currentUser) {
      openAuthModal();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${video.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          text: inputText.trim(),
          parentId: replyingTo ? replyingTo.id : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        setInputText('');
        setReplyingTo(null);
        if (onCommentAdded) onCommentAdded();
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      // error handling
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          const isLiked = !c.isLiked;
          return {
            ...c,
            isLiked,
            likesCount: isLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1),
          };
        }
        return c;
      })
    );
  };

  const handleStartReply = (c: Comment) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setReplyingTo({
      id: c.id,
      username: c.user.username,
      displayName: c.user.displayName,
    });
  };

  const handleBlockUserFromComment = (comment: Comment) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setOpenMenuCommentId(null);
    setConfirmTarget({
      isOpen: true,
      type: 'block',
      user: {
        id: comment.userId,
        username: comment.user.username,
        displayName: comment.user.displayName,
        avatarUrl: comment.user.avatarUrl,
      },
    });
  };

  const handleMuteUserFromComment = (comment: Comment) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setOpenMenuCommentId(null);
    setConfirmTarget({
      isOpen: true,
      type: 'mute',
      user: {
        id: comment.userId,
        username: comment.user.username,
        displayName: comment.user.displayName,
        avatarUrl: comment.user.avatarUrl,
      },
    });
  };

  const handleConfirmAction = async () => {
    if (!currentUser || !confirmTarget.user) return;
    setActionLoading(true);
    try {
      const endpoint = confirmTarget.type === 'block' ? 'block' : 'mute';
      const res = await fetch(`/api/users/${confirmTarget.user.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
      });

      if (res.ok) {
        if (confirmTarget.type === 'block') {
          // Remove blocked user's comments from current view immediately
          setComments(prev => prev.filter(c => c.userId !== confirmTarget.user!.id));
        }
        setConfirmTarget({ isOpen: false, type: 'block', user: null });
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div
      id="comment-drawer-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity"
    >
      <div
        id="comment-drawer-container"
        onClick={e => {
          e.stopPropagation();
          setOpenMenuCommentId(null);
        }}
        className="flex h-[72vh] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/10 bg-zinc-900 text-white shadow-2xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-bold text-white">
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </h3>
          </div>
          <button
            id="close-comments-btn"
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-zinc-500">
              <MessageCircle className="h-10 w-10 stroke-1 text-zinc-600 mb-2" />
              <p className="text-sm font-medium">Be the first to comment!</p>
              <p className="text-xs text-zinc-600">Share your thoughts with the creator</p>
            </div>
          ) : (
            comments.map(c => {
              const isTargetComment = highlightCommentId === c.id;
              const parentComment = c.parentId ? comments.find(p => p.id === c.parentId) : null;
              const isOwnComment = currentUser && currentUser.id === c.userId;

              return (
                <div
                  key={c.id}
                  ref={isTargetComment ? highlightedRef : undefined}
                  className={`flex items-start justify-between gap-3 p-2 rounded-xl transition-colors relative ${
                    isTargetComment ? 'bg-rose-500/10 border border-rose-500/30' : ''
                  } ${c.parentId ? 'ml-6 pl-2 border-l-2 border-zinc-700/60' : ''}`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <img
                      src={c.user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.userId}`}
                      alt={c.user?.username || 'user'}
                      className="h-8 w-8 shrink-0 rounded-full object-cover border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-zinc-300 truncate">
                            {c.user?.displayName || c.user?.username || 'User'}
                          </span>
                          {c.user?.isVerified && (
                            <span className="text-[10px] text-sky-400">✓</span>
                          )}
                        </div>

                        {/* Comment Options Button (Block/Mute/Report) */}
                        {!isOwnComment && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setOpenMenuCommentId(openMenuCommentId === c.id ? null : c.id);
                              }}
                              className="p-1 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-white/5 transition-colors"
                              title="Comment options"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>

                            {openMenuCommentId === c.id && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/10 bg-zinc-900 py-1.5 shadow-2xl z-30 animate-fade-in"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleBlockUserFromComment(c)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-white/5 transition-colors"
                                >
                                  <UserX className="h-3.5 w-3.5 shrink-0" />
                                  <span>Block @{c.user.username}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleMuteUserFromComment(c)}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-amber-400 hover:bg-white/5 transition-colors"
                                >
                                  <VolumeX className="h-3.5 w-3.5 shrink-0" />
                                  <span>Mute @{c.user.username}</span>
                                </button>

                                {onOpenReportUser && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuCommentId(null);
                                      onOpenReportUser({ id: c.userId, username: c.user.username });
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/5 transition-colors border-t border-white/5 mt-1 pt-1.5"
                                  >
                                    <Flag className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                    <span>Report Comment</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {parentComment && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                          <CornerDownRight className="h-3 w-3 text-zinc-500" />
                          <span>Replying to <span className="text-rose-400">@{parentComment.user.username}</span></span>
                        </div>
                      )}

                      <p className="text-xs text-zinc-200 mt-0.5 break-words leading-relaxed">
                        {c.text}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                        <span>
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartReply(c)}
                          className="font-bold text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                        >
                          <Reply className="h-2.5 w-2.5" />
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLikeComment(c.id)}
                    className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-rose-500 transition-colors pt-1 shrink-0"
                  >
                    <Heart
                      className={`h-4 w-4 transition-transform active:scale-125 ${
                        c.isLiked ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                    <span className="text-[10px]">{c.likesCount || 0}</span>
                  </button>
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Replying banner */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-zinc-800/80 px-4 py-1.5 text-xs text-zinc-300 border-t border-white/10">
            <span className="truncate">
              Replying to <strong className="text-rose-400">@{replyingTo.username}</strong>
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-zinc-400 hover:text-white p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Emoji Quick Bar */}
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-1.5 overflow-x-auto no-scrollbar">
          {emojiList.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => setInputText(prev => prev + emoji)}
              className="text-base hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="border-t border-white/10 p-3 bg-zinc-950 flex items-center gap-2">
          <input
            id="comment-input-field"
            type="text"
            placeholder={
              !currentUser
                ? 'Log in to comment'
                : replyingTo
                ? `Reply to @${replyingTo.username}...`
                : 'Add a comment...'
            }
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={submitting}
            className="flex-1 rounded-full border border-white/10 bg-zinc-800 px-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-hidden"
          />
          <button
            id="send-comment-btn"
            type="submit"
            disabled={!inputText.trim() || submitting}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white disabled:opacity-40 hover:bg-rose-600 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Confirmation Modal */}
        <BlockConfirmModal
          isOpen={confirmTarget.isOpen}
          onClose={() => setConfirmTarget({ isOpen: false, type: 'block', user: null })}
          onConfirm={handleConfirmAction}
          type={confirmTarget.type}
          targetUser={confirmTarget.user}
          loading={actionLoading}
        />
      </div>
    </div>
  );
};
