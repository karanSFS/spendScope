"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  HiXMark,
  HiPlus,
  HiCheck,
  HiOutlineCamera,
  HiOutlineMicrophone,
} from "react-icons/hi2";
import { getCurrencySymbol } from "@/utils/currencies";
import { toLocalDateKey } from "@/lib/dateUtils";
import {
  evaluateExpression,
  formatExpressionResult,
  sanitizeExpressionInput,
} from "@/lib/expressionParser";
import { extractReceiptData } from "@/lib/receiptOcr";
import {
  isSpeechRecognitionSupported,
  createVoiceRecognizer,
  parseVoiceTransaction,
} from "@/lib/voiceParser";
import CategoryIcon from "@/components/shared/CategoryIcon";
import CalculatorKeypad from "./CalculatorKeypad";

const VOICE_NOTICE_ACK_KEY = "spendscope_voice_notice_ack";

export default function TransactionFormModal({
  open,
  initialTransaction = null,
  defaultKind = "expense",
  categories = [],
  currencyCode = "INR",
  onSave,
  onCreateCategory,
  onClose,
}) {
  const isEditing = Boolean(initialTransaction?.id);
  const symbol = getCurrencySymbol(currencyCode);

  const [kind, setKind] = useState(defaultKind);
  const [expression, setExpression] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(toLocalDateKey(new Date()));
  const [note, setNote] = useState("");
  const [showInlineCat, setShowInlineCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Receipt OCR states
  const fileInputRef = useRef(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [assistBanner, setAssistBanner] = useState("");

  // Voice Entry states
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognizerRef = useRef(null);

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) => String(c.kind || c.type || "expense").toLowerCase() === kind,
      ),
    [categories, kind],
  );

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    if (!open) {
      recognizerRef.current?.abort?.();
      recognizerRef.current = null;
      setListening(false);
      setInterimTranscript("");
      setShowVoiceNotice(false);
      setOcrRunning(false);
      setOcrStatus("");
      setAssistBanner("");
      return;
    }

    setError("");
    setShowInlineCat(false);
    setInlineCatName("");
    setAssistBanner("");
    setOcrStatus("");

    if (initialTransaction) {
      const k =
        String(
          initialTransaction.kind || initialTransaction.type || "expense",
        ).toLowerCase() === "income"
          ? "income"
          : "expense";
      setKind(k);
      setExpression(
        initialTransaction.amount != null
          ? String(initialTransaction.amount)
          : "",
      );
      setCategoryId(initialTransaction.category_id || "");
      setDate(initialTransaction.date || toLocalDateKey(new Date()));
      setNote(initialTransaction.note || "");
    } else {
      const k = defaultKind === "income" ? "income" : "expense";
      setKind(k);
      setExpression("");
      const defaultCats = categories.filter(
        (c) => String(c.kind || c.type || "expense").toLowerCase() === k,
      );
      setCategoryId(defaultCats[0]?.id || "");
      setDate(toLocalDateKey(new Date()));
      setNote("");
    }
  }, [open, initialTransaction, defaultKind, categories]);

  useEffect(() => {
    if (!open || isEditing) return;
    if (categoryId && filteredCategories.some((c) => c.id === categoryId)) {
      return;
    }
    if (filteredCategories[0]?.id) {
      setCategoryId(filteredCategories[0].id);
    } else {
      setCategoryId("");
    }
  }, [kind, filteredCategories, categoryId, open, isEditing]);

  useEffect(() => {
    return () => {
      recognizerRef.current?.abort?.();
    };
  }, []);

  if (!open) return null;

  const previewAmount = (() => {
    try {
      if (!expression.trim()) return null;
      return evaluateExpression(expression);
    } catch {
      return null;
    }
  })();

  const handleEvaluate = () => {
    try {
      const val = evaluateExpression(expression);
      setExpression(val > 0 ? formatExpressionResult(val) : "");
      setError("");
    } catch (err) {
      setError(err?.message || "Invalid calculation");
    }
  };

  const handleReceiptSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setAssistBanner("");
    setOcrRunning(true);
    setOcrStatus("Preparing receipt…");

    try {
      const extracted = await extractReceiptData(file, currencyCode, (p) => {
        if (p.stage === "loading_ocr") {
          setOcrStatus("Loading offline OCR engine…");
        } else if (p.stage === "recognizing") {
          setOcrStatus(`Scanning text (${Math.round(p.progress * 100)}%)…`);
        }
      });

      const foundParts = [];
      if (extracted.amount && extracted.amount > 0) {
        setExpression(formatExpressionResult(extracted.amount));
        foundParts.push(`Amount ${symbol}${formatExpressionResult(extracted.amount)}`);
      }
      if (extracted.date) {
        setDate(extracted.date);
        foundParts.push(`Date ${extracted.date}`);
      }
      if (extracted.note && !note.trim()) {
        setNote(extracted.note);
      }

      if (foundParts.length > 0) {
        setAssistBanner(
          `Receipt scanned (${foundParts.join(" · ")}). Review fields before saving.`,
        );
      } else {
        setAssistBanner(
          "No clear total or date detected — please enter amount manually.",
        );
      }
    } catch (err) {
      setError(err?.message || "Could not scan receipt image.");
    } finally {
      setOcrRunning(false);
      setOcrStatus("");
    }
  };

  const applyVoiceTranscript = (transcript) => {
    const parsed = parseVoiceTransaction(transcript, categories);
    if (parsed.kind) setKind(parsed.kind);
    if (parsed.amount && parsed.amount > 0) {
      setExpression(formatExpressionResult(parsed.amount));
    }
    if (parsed.categoryId) {
      setCategoryId(parsed.categoryId);
    }
    if (parsed.date) {
      setDate(parsed.date);
    }
    if (parsed.note) {
      setNote(parsed.note);
    }
    setAssistBanner(
      parsed.amount
        ? `Voice parsed: "${transcript}" — review before saving.`
        : `Heard "${transcript}" — enter amount manually if missed.`,
    );
  };

  const startVoiceCapture = () => {
    if (!speechSupported) return;
    if (listening) {
      recognizerRef.current?.stop?.();
      setListening(false);
      return;
    }

    setError("");
    setInterimTranscript("");
    const rec = createVoiceRecognizer({
      onInterim: (txt) => setInterimTranscript(txt),
      onResult: (finalTxt) => {
        setInterimTranscript("");
        setListening(false);
        applyVoiceTranscript(finalTxt);
      },
      onError: (errCode) => {
        setListening(false);
        setInterimTranscript("");
        if (errCode !== "aborted" && errCode !== "no-speech") {
          setError(`Voice input unavailable (${errCode}).`);
        }
      },
      onEnd: () => {
        setListening(false);
      },
    });

    if (!rec) return;
    recognizerRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setError("Could not start microphone recognition.");
    }
  };

  const handleVoiceButtonClick = () => {
    if (!speechSupported) return;
    if (listening) {
      startVoiceCapture();
      return;
    }
    const ack =
      typeof window !== "undefined" &&
      localStorage.getItem(VOICE_NOTICE_ACK_KEY) === "1";
    if (!ack) {
      setShowVoiceNotice(true);
      return;
    }
    startVoiceCapture();
  };

  const handleQuickCreateCategory = async () => {
    if (!inlineCatName.trim() || !onCreateCategory) return;
    const res = await onCreateCategory({
      name: inlineCatName.trim(),
      kind,
      icon_key: kind === "income" ? "salary" : "other",
      color: "#C88856",
    });
    if (res?.success && res.data?.id) {
      setCategoryId(res.data.id);
      setInlineCatName("");
      setShowInlineCat(false);
    } else if (res?.error) {
      setError(res.error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    let numericAmount = 0;
    try {
      numericAmount = evaluateExpression(expression);
    } catch (err) {
      setError(err?.message || "Enter a valid amount.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const res = await onSave?.({
        id: initialTransaction?.id || null,
        kind,
        amount: numericAmount,
        category_id: categoryId || null,
        date,
        note: note.trim(),
      });
      if (res?.success === false) {
        setError(res.error || "Failed to save transaction.");
        return;
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit Transaction" : "Add Transaction"}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "var(--add-sheet-bg)" }}
        className="w-full max-w-lg max-h-[94vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] border border-[var(--home-border)] text-[var(--home-text)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--home-border)] flex items-center justify-between gap-2">
          <h2 className="font-display text-xl text-[var(--home-text)]">
            {isEditing ? "Edit Transaction" : "New Transaction"}
          </h2>

          <div className="flex items-center gap-1.5">
            {/* Hidden receipt upload input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={handleReceiptSelected}
            />
            <button
              type="button"
              disabled={ocrRunning}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Scan Receipt"
              title="Scan Receipt (on-device OCR)"
              className="h-8 px-2.5 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-[11px] font-semibold text-[var(--home-text-secondary)] hover:text-[var(--home-accent)] hover:border-[var(--home-accent)] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <HiOutlineCamera className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Scan Receipt</span>
            </button>

            {speechSupported && (
              <button
                type="button"
                onClick={handleVoiceButtonClick}
                aria-label={listening ? "Stop voice input" : "Voice Entry"}
                title="Voice Entry"
                className={`h-8 px-2.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                  listening
                    ? "border-[var(--home-destructive)] bg-[var(--home-destructive)]/15 text-[var(--home-destructive)] animate-pulse"
                    : "border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)] hover:text-[var(--home-accent)] hover:border-[var(--home-accent)]"
                }`}
              >
                <HiOutlineMicrophone className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">
                  {listening ? "Listening…" : "Voice"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close transaction modal"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--home-text-muted)] hover:text-[var(--home-text)] hover:bg-[var(--home-track)] cursor-pointer"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 custom-scrollbar"
        >
          {/* One-time Voice Privacy Notice */}
          {showVoiceNotice && (
            <div className="p-3.5 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs text-[var(--home-text-secondary)] space-y-2.5">
              <p className="leading-relaxed">
                <strong>Voice Input Notice:</strong> Your browser&apos;s speech recognition service may process spoken audio with your browser vendor (e.g. Google or Apple) to convert speech to text.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem(VOICE_NOTICE_ACK_KEY, "1");
                    }
                    setShowVoiceNotice(false);
                    startVoiceCapture();
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-[11px] font-bold cursor-pointer"
                >
                  Continue &amp; Listen
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoiceNotice(false)}
                  className="px-3 py-1.5 rounded-full bg-[var(--home-track)] text-[11px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* OCR or Voice live feedback */}
          {(ocrRunning || ocrStatus || interimTranscript) && (
            <div className="p-3 rounded-2xl border border-[var(--home-accent)]/40 bg-[var(--home-track)] text-xs font-semibold text-[var(--home-text)]">
              {ocrStatus || `Listening: "${interimTranscript}"`}
            </div>
          )}

          {assistBanner && (
            <div className="p-3 rounded-2xl border border-[var(--home-income)]/40 bg-[var(--home-income-soft)] text-xs font-semibold text-[var(--home-income)]">
              {assistBanner}
            </div>
          )}

          {/* Expense / Income Pill Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[22px] bg-[var(--home-track)] border border-[var(--home-border)]">
            {[
              { id: "expense", label: "Expense" },
              { id: "income", label: "Income" },
            ].map((tab) => {
              const active = kind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKind(tab.id)}
                  className={`py-2 rounded-[18px] text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? tab.id === "income"
                        ? "bg-[var(--home-income)] text-white shadow-xs"
                        : "bg-[var(--home-expense)] text-white shadow-xs"
                      : "text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-2xl border border-[var(--home-destructive)]/40 bg-[var(--home-background)] text-xs font-semibold text-[var(--home-destructive)]"
            >
              {error}
            </div>
          )}

          {/* Amount Display + Expression Input */}
          <div className="rounded-[22px] border border-[var(--home-border)] bg-[var(--home-card)] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--home-text-muted)]">
              <span>Amount ({currencyCode})</span>
              {previewAmount !== null &&
                /[+\-*/]/.test(expression.slice(1)) && (
                  <span className="font-mono-num text-[var(--home-accent)]">
                    = {symbol}
                    {formatExpressionResult(previewAmount)}
                  </span>
                )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl sm:text-3xl text-[var(--home-text-muted)]">
                {symbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Transaction amount"
                value={expression}
                onChange={(e) => {
                  const cleaned = sanitizeExpressionInput(e.target.value);
                  if (/^[0-9+\-*/.]*$/.test(cleaned)) {
                    setExpression(cleaned);
                    if (error) setError("");
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "=" ||
                    (e.key === "Enter" && /[+\-*/]/.test(expression.slice(1)))
                  ) {
                    e.preventDefault();
                    handleEvaluate();
                  }
                }}
                placeholder="0.00 or 250+45"
                className="w-full bg-transparent font-mono-num text-2xl sm:text-3xl font-bold text-[var(--home-text)] placeholder-[var(--home-text-muted)] focus:outline-none"
              />
            </div>
          </div>

          {/* Interactive Calculator Keypad */}
          <CalculatorKeypad
            expression={expression}
            onChangeExpression={setExpression}
            onEvaluate={handleEvaluate}
            onClear={() => setExpression("")}
          />

          {/* Category Quick Chips + Inline Creation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)]">
                Category
              </label>
              {onCreateCategory && (
                <button
                  type="button"
                  onClick={() => setShowInlineCat((s) => !s)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--home-accent)] hover:underline cursor-pointer"
                >
                  <HiPlus className="w-3.5 h-3.5" />
                  <span>New Category</span>
                </button>
              )}
            </div>

            {showInlineCat && (
              <div className="flex items-center gap-2 p-2 rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)]">
                <input
                  type="text"
                  value={inlineCatName}
                  onChange={(e) => setInlineCatName(e.target.value)}
                  placeholder={`New ${kind} category name`}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--home-background)] text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleQuickCreateCategory}
                  className="px-3 py-1.5 rounded-xl bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <HiCheck className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar py-0.5">
              {filteredCategories.map((cat) => {
                const selected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selected
                        ? "border-[var(--home-accent)] bg-[var(--home-track)] text-[var(--home-text)] shadow-xs"
                        : "border-[var(--home-border)] bg-[var(--home-card)] text-[var(--home-text-secondary)] hover:text-[var(--home-text)]"
                    }`}
                  >
                    <CategoryIcon
                      iconKey={cat.icon_key || cat.icon || "other"}
                      color={cat.color || cat.color_code || "#C88856"}
                      size={14}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs sm:text-sm text-[var(--home-text)] focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="tx-note"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--home-text-secondary)] mb-1"
              >
                Note (Optional)
              </label>
              <input
                id="tx-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Merchant, items, or memo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] text-xs sm:text-sm text-[var(--home-text)] placeholder-[var(--home-text-muted)] focus:outline-none focus:border-[var(--home-accent)]"
              />
            </div>
          </div>

          {/* Save Footer */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-[var(--home-border)] bg-[var(--home-card)] text-xs sm:text-sm font-semibold text-[var(--home-text-secondary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-3 rounded-full bg-[var(--home-accent)] text-[var(--home-on-accent)] text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? "Saving…"
                : isEditing
                  ? "Save Changes"
                  : `Save ${kind === "income" ? "Income" : "Expense"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
