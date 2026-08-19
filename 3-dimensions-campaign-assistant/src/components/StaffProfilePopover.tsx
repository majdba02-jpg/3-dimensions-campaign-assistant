import React, { useState, useRef, useEffect } from 'react';
import { StaffMember } from '../types';
import { Mail, Phone, User, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface StaffProfilePopoverProps {
  staff: StaffMember;
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  showRoleBadge?: boolean;
}

export const StaffProfilePopover: React.FC<StaffProfilePopoverProps> = ({
  staff,
  children,
  align = 'left',
  className = '',
  showRoleBadge = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      checkPlacement();
      setIsOpen(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleFocus = () => {
    clearTimer();
    checkPlacement();
    setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only close if focus leaves both trigger and popover
    if (
      popoverRef.current &&
      (popoverRef.current.contains(e.relatedTarget as Node) ||
        triggerRef.current?.contains(e.relatedTarget as Node))
    ) {
      return;
    }
    clearTimer();
    setIsOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    checkPlacement();
    setIsOpen((prev) => !prev);
  };

  const checkPlacement = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // If trigger is near bottom of viewport, position popover above
      if (rect.bottom + 180 > viewportHeight && rect.top > 180) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  };

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimer();
    };
  }, [isOpen]);

  // Clean initials generator
  const initials = staff.name
    ? staff.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'U';

  const hasEmail = Boolean(staff.email && staff.email.trim());
  const hasPhone = Boolean(staff.phoneNumber && staff.phoneNumber.trim());

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={`Profile card for ${staff.name}, ${staff.role}`}
    >
      {/* Custom Trigger or Default Interactive Chip */}
      {children ? (
        children
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50/90 hover:bg-indigo-100 text-[#172DC3] border border-indigo-200/80 transition cursor-pointer select-none">
          <span className="w-4 h-4 rounded-full bg-[#172DC3] text-white text-[9px] flex items-center justify-center font-bold">
            {initials}
          </span>
          <span>{staff.name}</span>
          {showRoleBadge && (
            <span className="text-[10px] text-slate-500 font-semibold border-l border-indigo-200 pl-1.5 ml-0.5">
              {staff.role}
            </span>
          )}
        </span>
      )}

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.96, y: position === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: position === 'top' ? 4 : -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-label={`${staff.name} Details`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-50 w-64 bg-white rounded-2xl p-4 shadow-xl border border-slate-200 text-left cursor-default ${
              position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            } ${
              align === 'right'
                ? 'right-0'
                : align === 'center'
                ? 'left-1/2 -translate-x-1/2'
                : 'left-0'
            }`}
          >
            {/* Header: Avatar, Name & Role */}
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#160857] to-[#172DC3] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-[#15192B] text-sm truncate leading-tight">
                  {staff.name}
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#172DC3] bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md mt-1">
                  <ShieldCheck className="w-3 h-3 text-[#172DC3]" />
                  <span className="truncate">{staff.role}</span>
                </div>
              </div>
            </div>

            {/* Contact Rows (Omit cleanly if missing) */}
            {(hasEmail || hasPhone) ? (
              <div className="space-y-2.5 pt-3 text-xs">
                {hasEmail && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">
                      Email
                    </span>
                    <a
                      href={`mailto:${staff.email}`}
                      className="inline-flex items-center gap-2 text-slate-800 hover:text-[#172DC3] font-medium transition truncate max-w-full group"
                      title={`Send email to ${staff.email}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-1 rounded-md bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-[#172DC3] transition">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate underline decoration-slate-300 group-hover:decoration-[#172DC3]">
                        {staff.email}
                      </span>
                    </a>
                  </div>
                )}

                {hasPhone && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">
                      Phone
                    </span>
                    <a
                      href={`tel:${staff.phoneNumber?.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-2 text-slate-800 hover:text-[#172DC3] font-semibold transition group"
                      title={`Call ${staff.phoneNumber}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-1 rounded-md bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-[#172DC3] transition">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="underline decoration-slate-300 group-hover:decoration-[#172DC3]">
                        {staff.phoneNumber}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
