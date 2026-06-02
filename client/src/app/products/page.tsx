"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormLabel,
  IconButton,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import LockIcon from '@mui/icons-material/Lock';
import Collection from "@/components/Collections/Collection";
import { AppDescriptionEditor } from "@/components/Listings/AppDescriptionEditor";
import { ApplicationFeeTierBreakdownModal } from "@/components/Listings/ApplicationFeeTierBreakdownModal";
import {
  isAppDescriptionValid,
  toEditorHtml,
} from "@/lib/sanitize-html";
import { AuthContext } from "@/context/auth-context";
import { useForm } from "@/hooks/useForm";
import { useListings } from "@/hooks/use-listings";
import {
  BRAND_PALETTE,
  brandContainedButtonSx,
  listFormOutlinedFieldSx,
} from "@/theme/brand-palette";
import {
  CATEGORY_META,
  DIFFICULTY_OPTIONS,
  FLAT_LISTING_FEE,
  FREE_LISTINGS_COUNT,
  LISTING_CATEGORIES,
  PRIVATE_LISTING_FEE,
  TURNAROUND_OPTIONS,
  computeListingFee,
  determineApplicationFee,
  freeListingsRemaining,
  isWithinFreeListingTier,
} from "@/utils/listingOptions";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type {
  Inputs,
  Listing,
  ListingCategory,
  ListingDifficulty,
  ListingTurnaround,
} from "../../../types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStripeWallet } from "@/hooks/use-stripe-wallet";

const MAX_PHOTOS = 6;
// Mirror the backend multer limit so we reject giant files client-side
// before they ever leave the browser on submit.
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const LISTING_DRAFT_STORAGE_KEY = "dapandflip.newListingDraftId";

type PhotoSlot =
  | {
      kind: "file";
      id: string;
      file: File;
      preview: string;
    }
  | { kind: "remote"; id: string; url: string };

function readStoredDraftId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(LISTING_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function isoToDatetimeLocal(iso: string | Date | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 16);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse form / datetime-local values into ISO strings for `auctionStartDate` / `auctionEndDate`. */
function parseMonthlyRevenueInput(raw: unknown): number | undefined {
  if (raw === "" || raw == null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function toIsoDateString(raw: unknown): string | undefined {
  if (raw == null || raw === "") return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

function emptyNewListingInputs(): Record<string, Inputs> {
  return {
    appName: { value: "", isValid: false },
    tagline: { value: "", isValid: false },
    startingPrice: { value: 0, isValid: false },
    isBuyItNow: { value: false, isValid: true },
    buyItNowPrice: { value: 0, isValid: true },
    category: { value: "", isValid: false },
    turnaround: { value: "", isValid: false },
    difficulty: { value: "", isValid: false },
    ageOfBusiness: { value: 0, isValid: true },
    monthlyRevenue: { value: "", isValid: true },
    appDescription: { value: "", isValid: false },
    photos: { value: [], isValid: true },
    coverIndex: { value: 0, isValid: true },
    hasSalesToVerify: { value: false, isValid: true },
    hasAnalyticsToVerify: { value: false, isValid: true },
    agreeToTerms: { value: false, isValid: false },
    isAuction: { value: false, isValid: true },
    startDate: { value: new Date().toISOString(), isValid: true },
    endDate: { value: new Date().toISOString(), isValid: true },
    isPrivateListing: { value: false, isValid: true },
  };
}

export default function ProductsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = useContext(AuthContext);

  const { getPaymentMethods } = useStripeWallet();

  const category = params.get("category");
  const listMode = params.get("list") === "new";
  const editParam = params.get("edit")?.trim() ?? "";
  const listingFormMode = listMode || Boolean(editParam);
  const searchQuery = params.get("q");

  const [formState, inputHandler, setFormData] = useForm(
    emptyNewListingInputs(),
    false,
  );

  const { uploadPhotos, createListing, saveDraft, getListing, updateListing } =
    useListings();
  const queryClient = useQueryClient();

  const draftParam = params.get("draft");
  const [workListingId, setWorkListingId] = useState<string | null>(null);
  const [publishedEdit, setPublishedEdit] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [isSaveDrafting, setIsSaveDrafting] = useState(false);
  const [editBlocked, setEditBlocked] = useState(false);
  const [editListingWasPrivate, setEditListingWasPrivate] = useState(false);

  useLayoutEffect(() => {
    if (!listingFormMode) {
      setDraftHydrated(true);
      return;
    }
    const fromEdit = editParam?.trim();
    const fromDraft = draftParam?.trim();
    if (fromEdit) {
      setWorkListingId(fromEdit);
    } else if (fromDraft) {
      setWorkListingId(fromDraft);
      try {
        sessionStorage.setItem(LISTING_DRAFT_STORAGE_KEY, fromDraft);
      } catch {
        /* storage unavailable */
      }
    } else {
      setWorkListingId(null);
      try {
        sessionStorage.removeItem(LISTING_DRAFT_STORAGE_KEY);
      } catch {
        /* */
      }
      setFormData(emptyNewListingInputs(), false);
      setPhotoSlots((prev) => {
        prev.forEach((s) => {
          if (s.kind === "file") URL.revokeObjectURL(s.preview);
        });
        return [];
      });
      setCoverIndex(0);
    }
    setDraftHydrated(true);
  }, [listingFormMode, editParam, draftParam, setFormData]);

  useEffect(() => {
    if (
      !listingFormMode ||
      !workListingId ||
      !draftHydrated ||
      !auth.user?.id
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      setDraftLoading(true);
      setSubmitError(null);
      try {
        const found = await getListing(workListingId);
        if (cancelled) return;
        if (!found) {
          setSubmitError("That listing was not found on your account.");
          return;
        }

        const st = found.status ?? "";
        if (st === "sold" || st === "removed") {
          setSubmitError("This listing can’t be edited anymore.");
          return;
        }

        if (draftParam?.trim() && !editParam && st !== "draft") {
          setSubmitError(
            "This isn’t a draft - use Edit from your dashboard to change a live listing.",
          );
          return;
        }

        const isPublished =
          Boolean(editParam?.trim()) && found.status !== "draft";
        setPublishedEdit(isPublished);
        setEditBlocked(Boolean(isPublished && found.sellerCanEdit === false));
        setEditListingWasPrivate(Boolean(found.isPrivateListing));

        const appName = String(found.appName ?? "");
        const tagline = String(found.tagline ?? "");
        const appDescription = toEditorHtml(String(found.appDescription ?? ""));
        const startingPrice = Number(found.startingPrice ?? 0);
        const buyItNowPrice = Number(found.buyItNowPrice ?? 0);
        const isBuyItNow = Boolean(
          found.buyItNowPrice != null && buyItNowPrice > 0,
        );
        const category = String(found.category ?? "");
        const turnaround = String(found.turnaround ?? "");
        const difficulty = String(found.difficulty ?? "");
        const ageOfBusiness = Number(found.ageOfBusinessMonths ?? 0);
        const monthlyRevenue =
          found.monthlyRevenue != null ? Number(found.monthlyRevenue) : "";
        const isPrivateListingDraft = Boolean(found.isPrivateListing);
        const isAuction = found.saleType === "auction";

        const draftInputs = {
          appName: {
            value: appName,
            isValid: appName.trim().length >= 2,
          },
          tagline: {
            value: tagline,
            isValid: tagline.trim().length >= 6,
          },
          startingPrice: {
            value: startingPrice,
            isValid: Number.isFinite(startingPrice) && startingPrice > 0,
          },
          isBuyItNow: { value: isBuyItNow, isValid: true },
          buyItNowPrice: {
            value: buyItNowPrice,
            isValid:
              !isBuyItNow ||
              (Number.isFinite(buyItNowPrice) &&
                buyItNowPrice >= startingPrice),
          },
          category: {
            value: category,
            isValid: category.length > 0,
          },
          turnaround: {
            value: turnaround,
            isValid: turnaround.length > 0,
          },
          difficulty: {
            value: difficulty,
            isValid: difficulty.length > 0,
          },
          ageOfBusiness: {
            value: ageOfBusiness,
            isValid: Number.isFinite(ageOfBusiness) && ageOfBusiness >= 0,
          },
          monthlyRevenue: {
            value: monthlyRevenue,
            isValid: true,
          },
          isPrivateListing: {
            value: isPrivateListingDraft,
            isValid: true,
          },
          appDescription: {
            value: appDescription,
            isValid: isAppDescriptionValid(appDescription),
          },
          photos: { value: [], isValid: true },
          coverIndex: {
            value: found.coverIndex ?? 0,
            isValid: true,
          },
          hasSalesToVerify: {
            value: Boolean(found.hasSalesToVerify),
            isValid: true,
          },
          hasAnalyticsToVerify: {
            value: Boolean(found.hasAnalyticsToVerify),
            isValid: true,
          },
          agreeToTerms: isPublished
            ? { value: true, isValid: true }
            : { value: false, isValid: false },
          isAuction: { value: isAuction, isValid: true },
          startDate: {
            value: isoToDatetimeLocal(found.auctionStartDate),
            isValid: true,
          },
          endDate: {
            value: isoToDatetimeLocal(found.auctionEndDate),
            isValid: true,
          },
        };
        setFormData(
          draftInputs,
          Object.values(draftInputs).every((i) => i.isValid),
        );

        const urls = (found.photos ?? []).filter(Boolean);
        setPhotoSlots(
          urls.map((url) => ({
            kind: "remote" as const,
            id: `remote-${url}`,
            url,
          })),
        );
        setCoverIndex(
          Math.min(
            Math.max(0, found.coverIndex ?? 0),
            Math.max(0, urls.length - 1),
          ),
        );
      } catch (e) {
        if (!cancelled) {
          setSubmitError(
            e instanceof Error ? e.message : "Could not load that listing.",
          );
        }
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    listingFormMode,
    workListingId,
    draftHydrated,
    auth.user?.id,
    getListing,
    setFormData,
    draftParam,
    editParam,
  ]);

  // ── Photo upload state ────────────────────────────────────────────────────
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const photoSlotsRef = useRef(photoSlots);
  photoSlotsRef.current = photoSlots;
  const [coverIndex, setCoverIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeTierBreakdownOpen, setFeeTierBreakdownOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [hideAppDescriptionAlert, setHideAppDescriptionAlert] = useState(false);

  const {
    data: paymentMethods,
    isLoading: isLoadingCards,
    isError: cardsError,
    error: cardsErrorObj,
    refetch: refetchCards,
  } = useQuery({
    queryKey: ["stripe-payment-methods", auth.user?.stripeCustomerId],
    queryFn: () => getPaymentMethods(String(auth.user?.stripeCustomerId)),
    enabled: Boolean(auth.user?.stripeCustomerId && auth.hydrated),
  });

  /** Prefer Stripe’s default from the API; auth user fields are often stale until refetch. */
  const cardList = paymentMethods?.paymentMethods?.data ?? [];
  const defaultPmId =
    paymentMethods?.defaultPaymentMethodId ??
    auth?.user?.defaultPaymentIntendId ??
    auth?.user?.stripeDefaultPaymentMethodId ??
    null;
  const defaultStripePm =
    (defaultPmId ? cardList.find((pm) => pm.id === defaultPmId) : undefined) ??
    cardList[0];
  const card = defaultStripePm?.card;

  // Clamp cover index when slots shrink. We don't stash the file list in the
  // form reducer - the actual uploads happen at submit time, at which point
  // we replace this with the Cloudinary URLs. Keeping `photos` in the form
  // state just marks the field as filled.
  useEffect(() => {
    if (coverIndex >= photoSlots.length && photoSlots.length > 0) {
      setCoverIndex(0);
    }
    inputHandler(
      "coverIndex",
      Math.min(coverIndex, Math.max(0, photoSlots.length - 1)) as unknown as number,
      true,
    );
  }, [photoSlots, coverIndex, inputHandler]);

  const openPhotoPicker = () => photoInputRef.current?.click();

  const handlePhotoFilesSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = e.target;
    const picked = Array.from(input.files ?? []);
    input.value = ""; // allow re-picking the same file name later
    if (picked.length === 0) return;

    const remaining = MAX_PHOTOS - photoSlots.length;
    const capped = picked.slice(0, remaining);
    if (capped.length === 0) return;

    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of capped) {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
        rejected.push(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        rejected.push(
          `${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 15MB limit`,
        );
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length > 0) {
      setSubmitError(rejected.join(" · "));
    }
    if (accepted.length === 0) return;

    const nextSlots: PhotoSlot[] = accepted.map((file) => ({
      kind: "file" as const,
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotoSlots((prev) => [...prev, ...nextSlots]);
  };

  const handleRemovePhoto = (slotId: string) => {
    setPhotoSlots((prev) => {
      const target = prev.find((s) => s.id === slotId);
      if (target?.kind === "file") URL.revokeObjectURL(target.preview);
      return prev.filter((s) => s.id !== slotId);
    });
  };

  // Revoke any still-live blob URLs on unmount.
  useEffect(() => {
    return () => {
      photoSlotsRef.current.forEach((s) => {
        if (s.kind === "file") URL.revokeObjectURL(s.preview);
      });
    };
  }, []);

  const photoCount = photoSlots.length;

  const startingPriceNum = Number(formState?.inputs?.startingPrice?.value || 0);
  const isBuyItNow = Boolean(formState?.inputs?.isBuyItNow?.value);
  const buyItNowPriceNum = Number(formState?.inputs?.buyItNowPrice?.value || 0);

  const successFeeRate = determineApplicationFee(startingPriceNum);
  const successFeeAmount = Math.max(0, startingPriceNum * successFeeRate);
  const sellerTakeHome = Math.max(0, startingPriceNum - successFeeAmount);

  // First 3 listings are free; $2.99 per listing after that.
  const priorListings = Number(auth.user?.totalListings ?? 0);
  const isPrivateListing = Boolean(formState?.inputs?.isPrivateListing?.value);
  const listingFee = computeListingFee(priorListings, isPrivateListing);
  const withinFreeTier = isWithinFreeListingTier(priorListings);
  const freeRemaining = freeListingsRemaining(priorListings);
  const baseListingFee = withinFreeTier ? 0 : FLAT_LISTING_FEE;
  const privateListingFee = isPrivateListing ? PRIVATE_LISTING_FEE : 0;
  const needsPrivateFeeOnEdit =
    publishedEdit && isPrivateListing && !editListingWasPrivate;

  const selectedCategory = String(formState?.inputs?.category?.value || "");
  const selectedTurnaround = String(formState?.inputs?.turnaround?.value || "");
  const selectedDifficulty = String(formState?.inputs?.difficulty?.value || "");
  const hasSalesToVerify = Boolean(formState?.inputs?.hasSalesToVerify?.value);
  const hasAnalyticsToVerify = Boolean(
    formState?.inputs?.hasAnalyticsToVerify?.value
  );

  const isAuctionSale = Boolean(formState?.inputs?.isAuction?.value);

  // Human-readable labels for the fields we expect the user to fill in.
  // Keep this in sync with the `isValid: false` entries in the useForm
  // initial state above. If a field's `isValid` is still false when the
  // user clicks submit, we surface its label so they know what's missing.
  const FIELD_LABELS: Record<string, string> = {
    appName: "App name (min 2 characters)",
    tagline: "Tagline (min 6 characters)",
    startingPrice: "Starting price",
    buyItNowPrice: "Buy-it-now price (must be ≥ starting price)",
    category: "Category",
    turnaround: "Turnaround time",
    difficulty: "Level of difficulty",
    appDescription: "Description (min 40 characters)",
    agreeToTerms: "Agree to terms and conditions",
  };

  const missingFields = Object.entries(formState?.inputs || {})
    .filter(([id, input]) => !input?.isValid && FIELD_LABELS[id])
    .map(([id]) => FIELD_LABELS[id]);

  const stripeMissing =
    (listingFee > 0 || needsPrivateFeeOnEdit) && !auth?.user?.stripeCustomerId;

  const canSubmit = publishedEdit
    ? formState.isValid && !isSubmitting && !editBlocked && !stripeMissing
    : formState.isValid && !isSubmitting && !stripeMissing;

  const meta = useMemo(() => {
    if (!category) {
      return {
        title: searchQuery ? `Results for “${searchQuery}”` : "Discover apps",
        subtitle: searchQuery
          ? "Apps matching your search, ranked by community signal."
          : "Browse apps across categories, creators and price tiers on Dap & Flip.",
      };
    }
    return (
      CATEGORY_META[category] || {
        title: category.charAt(0).toUpperCase() + category.slice(1),
        subtitle: "Curated apps from indie creators.",
      }
    );
  }, [category, searchQuery]);

  const mergeAndUploadPhotos = useCallback(async (): Promise<string[]> => {
    const newFiles = photoSlots
      .filter(
        (s): s is Extract<PhotoSlot, { kind: "file" }> => s.kind === "file",
      )
      .map((s) => s.file);
    const freshUrls = newFiles.length ? await uploadPhotos(newFiles) : [];
    let i = 0;
    return photoSlots.map((s) =>
      s.kind === "remote" ? s.url : freshUrls[i++],
    );
  }, [photoSlots, uploadPhotos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.isValid || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (photoSlots.length > 0) {
        try {
          uploadedUrls = await mergeAndUploadPhotos();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Photo upload failed";
          setSubmitError(`${message}. Please try again.`);
          return;
        }
      }

      const auctionStartDate = toIsoDateString(formState.inputs.startDate?.value);
      const auctionEndDate = toIsoDateString(formState.inputs.endDate?.value);

      if (isAuctionSale && (!auctionStartDate || !auctionEndDate)) {
        setSubmitError(
          "Please set valid auction start and end times before submitting.",
        );
        return;
      }

      const basePayload: Partial<Listing> = {
        appName: String(formState.inputs.appName?.value ?? ""),
        tagline: String(formState.inputs.tagline?.value ?? ""),
        appDescription: String(formState.inputs.appDescription?.value ?? ""),
        startingPrice: startingPriceNum,
        buyItNowPrice: isBuyItNow ? buyItNowPriceNum : undefined,
        category: selectedCategory as ListingCategory,
        turnaround: selectedTurnaround as ListingTurnaround,
        difficulty: selectedDifficulty as ListingDifficulty,
        ageOfBusinessMonths: Number(formState.inputs.ageOfBusiness?.value || 0),
        monthlyRevenue: parseMonthlyRevenueInput(
          formState.inputs.monthlyRevenue?.value,
        ),
        isPrivateListing,
        photos: uploadedUrls,
        coverIndex: Math.min(coverIndex, Math.max(0, uploadedUrls.length - 1)),
        hasSalesToVerify,
        hasAnalyticsToVerify,
        saleType: isAuctionSale ? "auction" : "fixed",

        ...(isAuctionSale && auctionStartDate && auctionEndDate
          ? { auctionStartDate, auctionEndDate }
          : {}),
      };

      if (publishedEdit) {
        if (!workListingId || editBlocked) {
          setSubmitError(
            "You can’t save changes to this listing in its current state.",
          );
          return;
        }
        await updateListing(workListingId, basePayload);
        await queryClient.invalidateQueries({
          queryKey: ["my-listings", auth.user?.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ["listing", workListingId],
        });
        if (auth.user?.id) {
          router.push(
            `/my-settings/${encodeURIComponent(auth.user.id)}`,
          );
        }
        return;
      }

      if (stripeMissing) {
        setSubmitError(
          "Add a default payment method in your wallet before submitting this listing.",
        );
        return;
      }

      const payload: Partial<Listing> & { existingDraftId?: string } = {
        ...basePayload,
        ...(workListingId ? { existingDraftId: workListingId } : {}),
      };

      const created = await createListing(payload);
      if (auth.user) {
        auth.update({
          ...auth.user,
          totalListings: Number(auth.user.totalListings ?? 0) + 1,
        });
      }
      try {
        sessionStorage.setItem(
          LISTING_DRAFT_STORAGE_KEY,
          String(created?._id ?? ""),
        );
      } catch {
        /* */
      }
      try {
        sessionStorage.setItem(
          "dapandflip.pendingListing",
          JSON.stringify({
            ...payload,
            _id: created?._id,
            submittedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // storage may be unavailable (private mode etc.) - non-fatal
      }

      await queryClient.invalidateQueries({
        queryKey: ["my-listings", auth.user?.id],
      });

      if (hasSalesToVerify || hasAnalyticsToVerify) {
        router.push("/products/verify");
      } else {
        router.push("/products?listed=1");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create listing";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isSaveDrafting || isSubmitting) return;
    if (!auth.user?.id) {
      setSubmitError("Sign in to save a draft.");
      return;
    }
    setSubmitError(null);
    setIsSaveDrafting(true);
    try {
      if (publishedEdit) {
        if (!workListingId || editBlocked) {
          setSubmitError("You can’t save this listing right now.");
          return;
        }
        let urls: string[] = [];
        if (photoSlots.length > 0) {
          try {
            urls = await mergeAndUploadPhotos();
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Photo upload failed";
            setSubmitError(`${message}. Please try again.`);
            return;
          }
        }
        const auctionStartDate = toIsoDateString(
          formState.inputs.startDate?.value,
        );
        const auctionEndDate = toIsoDateString(formState.inputs.endDate?.value);
        if (isAuctionSale && (!auctionStartDate || !auctionEndDate)) {
          setSubmitError(
            "Please set valid auction start and end times before saving.",
          );
          return;
        }
        const updated = await updateListing(workListingId, {
          appName: String(formState.inputs.appName?.value ?? ""),
          tagline: String(formState.inputs.tagline?.value ?? ""),
          appDescription: String(formState.inputs.appDescription?.value ?? ""),
          startingPrice: startingPriceNum,
          buyItNowPrice: isBuyItNow ? buyItNowPriceNum : undefined,
          category: selectedCategory as ListingCategory,
          turnaround: selectedTurnaround as ListingTurnaround,
          difficulty: selectedDifficulty as ListingDifficulty,
          ageOfBusinessMonths: Number(
            formState.inputs.ageOfBusiness?.value || 0,
          ),
          monthlyRevenue: parseMonthlyRevenueInput(
            formState.inputs.monthlyRevenue?.value,
          ),
          isPrivateListing,
          photos: urls,
          coverIndex: Math.min(coverIndex, Math.max(0, urls.length - 1)),
          hasSalesToVerify,
          hasAnalyticsToVerify,
          saleType: isAuctionSale ? "auction" : "fixed",
          ...(isAuctionSale && auctionStartDate && auctionEndDate
            ? { auctionStartDate, auctionEndDate }
            : {}),
        });
        const pics = updated.photos ?? [];
        setPhotoSlots(
          pics.map((url) => ({
            kind: "remote" as const,
            id: `remote-${url}`,
            url,
          })),
        );
        setCoverIndex(
          pics.length
            ? Math.min(updated.coverIndex ?? 0, pics.length - 1)
            : 0,
        );
        await queryClient.invalidateQueries({
          queryKey: ["my-listings", auth.user.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ["listing", workListingId],
        });
        router.push(`/my-settings/${encodeURIComponent(auth.user.id)}`);
        return;
      }

      let urls: string[] = [];
      if (photoSlots.length > 0) {
        try {
          urls = await mergeAndUploadPhotos();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Photo upload failed";
          setSubmitError(`${message}. Please try again.`);
          return;
        }
      }

      const auctionStartDate = toIsoDateString(
        formState.inputs.startDate?.value,
      );
      const auctionEndDate = toIsoDateString(formState.inputs.endDate?.value);

      const saved = await saveDraft({
        draftListingId: workListingId ?? undefined,
        isBuyItNow: Boolean(formState.inputs.isBuyItNow?.value),
        appName: String(formState.inputs.appName?.value ?? ""),
        tagline: String(formState.inputs.tagline?.value ?? ""),
        appDescription: String(formState.inputs.appDescription?.value ?? ""),
        startingPrice: startingPriceNum,
        buyItNowPrice: isBuyItNow ? buyItNowPriceNum : undefined,
        category: selectedCategory as ListingCategory,
        turnaround: selectedTurnaround as ListingTurnaround,
        difficulty: selectedDifficulty as ListingDifficulty,
        ageOfBusinessMonths: Number(formState.inputs.ageOfBusiness?.value || 0),
        monthlyRevenue: parseMonthlyRevenueInput(
          formState.inputs.monthlyRevenue?.value,
        ),
        isPrivateListing,
        photos: urls,
        coverIndex: Math.min(coverIndex, Math.max(0, urls.length - 1)),
        hasSalesToVerify,
        hasAnalyticsToVerify,
        saleType: isAuctionSale ? "auction" : "fixed",
        ...(isAuctionSale && auctionStartDate && auctionEndDate
          ? { auctionStartDate, auctionEndDate }
          : {}),
      });

      const id = String(saved._id);
      setWorkListingId(id);
      try {
        sessionStorage.setItem(LISTING_DRAFT_STORAGE_KEY, id);
      } catch {
        /* */
      }

      const pics = saved.photos ?? [];
      setPhotoSlots(
        pics.map((url) => ({
          kind: "remote" as const,
          id: `remote-${url}`,
          url,
        })),
      );
      setCoverIndex(
        pics.length
          ? Math.min(saved.coverIndex ?? 0, pics.length - 1)
          : 0,
      );

      await queryClient.invalidateQueries({
        queryKey: ["my-listings", auth.user.id],
      });
      router.push(`/my-settings/${encodeURIComponent(auth.user.id)}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not save draft.",
      );
    } finally {
      setIsSaveDrafting(false);
    }
  };

  if (listingFormMode) {
    return (
      <>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper
          elevation={0}
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            backgroundColor: BRAND_PALETTE.listFormSurface,
            border: `1px solid ${BRAND_PALETTE.borderSubtle}`,
          }}
        >
          <Stack spacing={2}>
            {draftLoading && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Loading your listing…
              </Alert>
            )}
            {publishedEdit && editBlocked && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                This listing can&apos;t be edited while there are bids or a
                purchase in progress.
              </Alert>
            )}
            {publishedEdit && workListingId && !editBlocked && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  You can connect or update{" "}
                  <b>Google Analytics</b> anytime - it doesn&apos;t require
                  editing this form.
                </Typography>
                <Button
                  component={Link}
                  href={`/products/verify?listingId=${encodeURIComponent(workListingId)}`}
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Open verification &amp; GA linking
                </Button>
              </Alert>
            )}
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              {publishedEdit ? "Edit listing - Any changes require new Admin review." : "Submit your app"}
            </Typography>
            <Typography variant="h3" fontWeight={900}>
              {publishedEdit
                ? "Update your listing."
                : "List your App."}
            </Typography>
            <Typography color="text.secondary">
              {publishedEdit
                ? "Save changes here whenever you need - as long as there are no bids or active purchases on this listing."
                : "Let the world know you're selling an App. Pending a short review, it will be live within 24 hours."}
            </Typography>
            {!publishedEdit && (
              <Alert severity={withinFreeTier ? "success" : "info"}>
                <Typography variant="body2">
                  {withinFreeTier
                    ? freeRemaining === FREE_LISTINGS_COUNT
                      ? `Your first ${FREE_LISTINGS_COUNT} listings are free on Dap & Flip. After that it's a flat $${FLAT_LISTING_FEE.toFixed(2)} per listing.`
                      : `You have ${freeRemaining} free listing${freeRemaining === 1 ? "" : "s"} left. After that it's $${FLAT_LISTING_FEE.toFixed(2)} per listing.`
                    : `Listing fee: $${FLAT_LISTING_FEE.toFixed(2)}. Your first ${FREE_LISTINGS_COUNT} listings are always free.`}
                </Typography>
              </Alert>
            )}

            <Alert severity="warning">
              <Typography variant="body2" color="text.secondary">
                Incomplete or &quot;in-progress&quot; apps will be rejected.
              </Typography>
            </Alert>
            <Stack spacing={1} direction="row" alignItems="center">
              {/*
                Mutually-exclusive "Auction" vs "Sale" toggle. We always
                pass `true` for isValid - either option is a legitimate
                choice, so this toggle should never invalidate the form.
              */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Checkbox
                  size="small"
                  checked={Boolean(formState?.inputs?.isAuction?.value)}
                  onChange={() => inputHandler("isAuction", true, true)}
                />
                <Typography color="text.secondary">Auction</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Checkbox
                  size="small"
                  checked={Boolean(!formState?.inputs?.isAuction?.value)}
                  onChange={() => inputHandler("isAuction", false, true)}
                />
                <Typography color="text.secondary">Sale</Typography>
              </Stack>
            </Stack>

            {formState?.inputs?.isAuction?.value ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                 sx={listFormOutlinedFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonthIcon />
                      </InputAdornment>
                    )
                  }
                }}
                type="date"
                fullWidth
                value={formState?.inputs?.startDate?.value || ""}
                onChange={(e) =>
                  inputHandler("startDate", e.target.value, true)
                }
                />
                <TextField 
                sx={listFormOutlinedFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonthIcon />
                      </InputAdornment>
                    )
                  }
                }}
                type="date"
                fullWidth
                value={formState?.inputs?.endDate?.value || ""}
                onChange={(e) =>
                  inputHandler("endDate", e.target.value, true)
                }
                />
              </Stack>
            ): <Typography variant="subtitle2" color="text.secondary">Good for 90 days or when sold/removed.</Typography>}

            {/* Basics */}
            <TextField
              placeholder="App name"
              fullWidth
              value={formState?.inputs?.appName?.value || ""}
              onChange={(e) =>
                inputHandler(
                  "appName",
                  e.target.value,
                  e.target.value.trim().length >= 2
                )
              }
              sx={listFormOutlinedFieldSx}
              InputProps={{ sx: { borderRadius: 2 } }}
            />

            <TextField
              placeholder="One-line tagline (what does it do?)"
              fullWidth
              value={formState?.inputs?.tagline?.value || ""}
              sx={listFormOutlinedFieldSx}
              onChange={(e) =>
                inputHandler(
                  "tagline",
                  e.target.value,
                  e.target.value.trim().length >= 6
                )
              }
              InputProps={{ sx: { borderRadius: 2 } }}
            />

            {/* Pricing */}
            <TextField
              type="number"
              placeholder="Starting Price (lowest price you will accept)"
              fullWidth
              value={formState?.inputs?.startingPrice?.value || ""}
              sx={listFormOutlinedFieldSx}
              onChange={(e) => {
                const n = Number(e.target.value);
                inputHandler("startingPrice", n, Number.isFinite(n) && n >= 0);
              }}
              InputProps={{
                sx: { borderRadius: 2 },
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
            />

            {formState?.inputs?.isAuction?.value && <Stack direction="row" spacing={1} alignItems="center">
              <Checkbox
                checked={isBuyItNow}
                onChange={(e) =>
                  inputHandler("isBuyItNow", e.target.checked, true)
                }
              />
              <Typography color="text.secondary">
                Set a buy-it-now price?
              </Typography>
            </Stack>}
            {isBuyItNow && (
              <TextField
                type="number"
                placeholder="Buy-it-now price"
                fullWidth
                sx={listFormOutlinedFieldSx}
                value={formState?.inputs?.buyItNowPrice?.value || ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  inputHandler(
                    "buyItNowPrice",
                    n,
                    Number.isFinite(n) && n >= startingPriceNum
                  );
                }}
                helperText={
                  buyItNowPriceNum > 0 && buyItNowPriceNum < startingPriceNum
                    ? "Buy-it-now must be ≥ starting price."
                    : " "
                }
                InputProps={{
                  sx: { borderRadius: 2 },
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            )}

            {/* Category chips - matches homepage hero categories */}
            <FormControl>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Category</FormLabel>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                Pick the category buyers will find you under.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {LISTING_CATEGORIES.map((c) => {
                  const selected = selectedCategory === c.value;
                  return (
                    <Chip
                      key={c.value}
                      icon={c.icon}
                      clickable
                      label={c.label}
                      onClick={() =>
                        inputHandler("category", c.value, true)
                      }
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      sx={{
                        fontWeight: 600,
                        backgroundColor: !selected
                          ? BRAND_PALETTE.listFormField
                          : undefined,
                      }}
                    />
                  );
                })}
              </Stack>
            </FormControl>

            {/* Turnaround time */}
            <FormControl>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
                Turnaround time
              </FormLabel>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                How long you&apos;ll need to prepare all materials (code, credentials,
                docs, deployment access) for a proper handoff.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {TURNAROUND_OPTIONS.map((t) => {
                  const selected = selectedTurnaround === t.value;
                  return (
                    <Chip
                      key={t.value}
                      icon={<TimerRoundedIcon sx={{ fontSize: 16 }} />}
                      clickable
                      label={t.label}
                      onClick={() =>
                        inputHandler("turnaround", t.value, true)
                      }
                      color={selected ? "primary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      sx={{
                        fontWeight: 600,
                        backgroundColor: !selected
                          ? BRAND_PALETTE.listFormField
                          : undefined,
                      }}
                    />
                  );
                })}
              </Stack>
              {selectedTurnaround && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {
                    TURNAROUND_OPTIONS.find((t) => t.value === selectedTurnaround)
                      ?.hint
                  }
                </Typography>
              )}
            </FormControl>

            {/* Difficulty / level of management */}
            <FormControl sx={{ width: "100%", minWidth: 0 }}>
              <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
                Level of difficulty
              </FormLabel>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                How technical does the new owner need to be to manage and modify
                this app?
              </Typography>
              <RadioGroup
                value={selectedDifficulty}
                onChange={(e) =>
                  inputHandler("difficulty", e.target.value, true)
                }
                sx={{ width: "100%", minWidth: 0, mx: 0 }}
              >
                <Stack spacing={1}>
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const selected = selectedDifficulty === opt.value;
                    return (
                      <Paper
                        key={opt.value}
                        variant="outlined"
                        onClick={() =>
                          inputHandler("difficulty", opt.value, true)
                        }
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          cursor: "pointer",
                          width: "100%",
                          maxWidth: "100%",
                          boxSizing: "border-box",
                          overflow: "hidden",
                          borderColor: selected
                            ? "rgba(124,58,237,0.7)"
                            : "#ececec",
                          background: selected
                            ? BRAND_PALETTE.mint
                            : BRAND_PALETTE.listFormField,
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="flex-start"
                          sx={{ minWidth: 0 }}
                        >
                          <Radio
                            checked={selected}
                            value={opt.value}
                            size="small"
                            sx={{ mt: -0.5, flexShrink: 0, p: 0.5 }}
                          />
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1.5,
                              background: "rgba(124,58,237,0.08)",
                              color: BRAND_PALETTE.seafoam,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {opt.icon}
                          </Box>
                          <Stack sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              flexWrap="wrap"
                              useFlexGap
                              sx={{ rowGap: 0.5 }}
                            >
                              <Typography
                                fontWeight={700}
                                sx={{ lineHeight: 1.3 }}
                              >
                                {opt.label}
                              </Typography>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={opt.summary}
                                sx={{
                                  height: "auto",
                                  maxWidth: "100%",
                                  fontSize: 10,
                                  "& .MuiChip-label": {
                                    whiteSpace: "normal",
                                    lineHeight: 1.3,
                                    py: 0.25,
                                  },
                                }}
                              />
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.25,
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {opt.details}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* Photos */}
            <Stack
              direction="row"
              alignItems="baseline"
              justifyContent="space-between"
              spacing={1}
              flexWrap="wrap"
            >
              <Typography variant="subtitle2" color="text.secondary">
                Add up to {MAX_PHOTOS} screenshots (1000 x 1000 recommended)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {photoCount}/{MAX_PHOTOS} selected
                {photoCount > 0 && " - click the star to set the cover"}
              </Typography>
            </Stack>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={handlePhotoFilesSelected}
            />
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {photoSlots.map((slot, i) => {
                const isCover = i === coverIndex;
                return (
                  <Paper
                    key={slot.id}
                    variant="outlined"
                    sx={{
                      height: 75,
                      width: 75,
                      borderRadius: 2,
                      position: "relative",
                      overflow: "hidden",
                      borderColor: isCover ? BRAND_PALETTE.seafoam : undefined,
                      boxShadow: isCover
                        ? "0 0 0 2px rgba(124,58,237,0.35)"
                        : undefined,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slot.kind === "remote" ? slot.url : slot.preview}
                      alt={`Screenshot ${i + 1}`}
                      style={{
                        height: "100%",
                        width: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <IconButton
                      size="small"
                      aria-label={isCover ? "Cover photo" : "Set as cover"}
                      onClick={() => setCoverIndex(i)}
                      sx={{
                        position: "absolute",
                        left: 2,
                        top: 2,
                        width: 22,
                        height: 22,
                        bgcolor: isCover
                          ? BRAND_PALETTE.seafoam
                          : "rgba(255,255,255,0.85)",
                        color: isCover ? "#fff" : BRAND_PALETTE.seafoam,
                        "&:hover": {
                          bgcolor: isCover ? "#6d28d9" : "#fff",
                        },
                      }}
                    >
                      <StarRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Remove photo"
                      onClick={() => handleRemovePhoto(slot.id)}
                      sx={{
                        position: "absolute",
                        right: 2,
                        top: 2,
                        width: 22,
                        height: 22,
                        bgcolor: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                      }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Paper>
                );
              })}

              {photoCount < MAX_PHOTOS && (
                <Paper
                  variant="outlined"
                  role="button"
                  tabIndex={0}
                  onClick={openPhotoPicker}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openPhotoPicker();
                  }}
                  sx={{
                    height: 75,
                    width: 75,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    borderStyle: "dashed",
                    color: "text.secondary",
                    "&:hover": {
                      borderColor: BRAND_PALETTE.seafoam,
                      color: BRAND_PALETTE.seafoam,
                      bgcolor: "rgba(124,58,237,0.04)",
                    },
                  }}
                >
                  <AddIcon />
                </Paper>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Up to 6 screenshots, 15MB each. New files upload when you save a
              draft or submit the listing.
            </Typography>

            {/* Business meta + long description */}
            <TextField
              label="Revenue per month"
              type="number"
              fullWidth
              placeholder="Monthly revenue (USD)"
              helperText="Approximate income this project earns per month. You can also post screenshots"
              value={formState?.inputs?.monthlyRevenue?.value ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  inputHandler("monthlyRevenue", "", true);
                  return;
                }
                const n = Number(raw);
                inputHandler(
                  "monthlyRevenue",
                  raw,
                  Number.isFinite(n) && n >= 0,
                );
              }}
              sx={listFormOutlinedFieldSx}
              InputProps={{
                sx: { borderRadius: 2 },
                inputProps: { min: 0, step: "any" },
              }}
            />

            <TextField
            helperText="How long has the app been in production - live (months)?"
              placeholder="Age of the business (months)"
              type="number"
              fullWidth
              value={formState?.inputs?.ageOfBusiness?.value || ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                inputHandler(
                  "ageOfBusiness",
                  n,
                  Number.isFinite(n) && n >= 0
                );
              }}
              sx={listFormOutlinedFieldSx}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            

            {!hideAppDescriptionAlert && (
              <Alert severity="info" onClose={() => setHideAppDescriptionAlert(true)}>
              <Typography variant="body2" color="text.secondary">
                Do not include personal contact details in app description.
              </Typography>
            </Alert>
          )}
            
            <AppDescriptionEditor
              key={
                workListingId
                  ? `app-desc-${workListingId}-${draftLoading ? "loading" : "ready"}`
                  : "app-desc-new"
              }
              value={String(formState?.inputs?.appDescription?.value || "")}
              onChange={(html, valid) =>
                inputHandler("appDescription", html, valid)
              }
            />

            <Divider />

            {/* Verified sales & analytics opt-in */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: "rgba(124,58,237,0.35)",
                background: "rgba(124,58,237,0.04)",
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <VerifiedRoundedIcon sx={{ color: BRAND_PALETTE.seafoam }} />
                  <Typography fontWeight={700}>
                    Earn the Verified Sales &amp; Analytics badge
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Optional - connect RevenueCat, Stripe, Google Analytics or
                  similar after you submit. Listings with verified data sell
                  faster and for more.
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                  disabled={true}
                    size="small"
                    checked={hasSalesToVerify}
                    onChange={(e) =>
                      inputHandler(
                        "hasSalesToVerify",
                        e.target.checked,
                        true
                      )
                    }
                  />
                  <Typography color="text.secondary">
                    I have <b>sales</b> data I can connect (Stripe, RevenueCat…) - coming soon
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    size="small"
                    checked={hasAnalyticsToVerify}
                    onChange={(e) =>
                      inputHandler(
                        "hasAnalyticsToVerify",
                        e.target.checked,
                        true
                      )
                    }
                  />
                  <Typography color="text.secondary">
                    I have <b>Google Analytics</b> data I can connect
                  </Typography>
                </Stack>

                {(hasSalesToVerify || hasAnalyticsToVerify) && !publishedEdit && (
                  <Chip
                    size="small"
                    icon={<InsightsRoundedIcon sx={{ fontSize: 14 }} />}
                    label="You'll be taken to the verification step after submit"
                    variant="outlined"
                    sx={{ width: "fit-content" }}
                  />
                )}
              </Stack>
            </Paper>

            {/* Private listing opt-in */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: "rgba(124,58,237,0.35)",
                background: "rgba(124,58,237,0.04)",
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LockIcon sx={{ color: BRAND_PALETTE.seafoam }} />
                  <Typography fontWeight={700}>
                    Want to make this listing private?
                  </Typography>
                </Stack>
                <Typography variant="subtitle2" color="text.secondary">
                Control who can and can&apos;t view your app. We e-mail you when a request is made, you review the customer, start a conversation, and deny or grant access.
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    size="small"
                    checked={Boolean(formState?.inputs?.isPrivateListing?.value)}
                    onChange={(e) =>
                      inputHandler(
                        "isPrivateListing",
                        e.target.checked,
                        true
                      )
                    }
                  />
                  <Typography color="text.secondary">
                   Make this listing private ($4.99 fee)
                  </Typography>
                </Stack>
               
              </Stack>
            </Paper>

            {!publishedEdit && (
              <>
            <Typography variant="caption" color="text.secondary">
              By submitting you agree to Dap & Flip&apos;s creator terms. You keep
              
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Checkbox
                size="small"
                checked={Boolean(formState?.inputs?.agreeToTerms?.value)}
                onChange={(e) =>
                  inputHandler("agreeToTerms", e.target.checked, e.target.checked)
                }
              />
              <Typography color="text.secondary">
                I agree to the terms and conditions
              </Typography>
            </Stack>
              </>
            )}

            <Divider />

            {/* Summary + submit */}
            {!publishedEdit && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: BRAND_PALETTE.listFormPanel,
              }}
            >
              <Stack spacing={0.75}>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Listing fee today
                  </Typography>
                  <Typography variant="body2">
                    {listingFee === 0 ? (
                      <Box component="span" sx={{ color: "success.main", fontWeight: 700 }}>
                        {withinFreeTier
                          ? `Free · ${freeRemaining} of ${FREE_LISTINGS_COUNT} left`
                          : "Free"}
                      </Box>
                    ) : (
                      `$${listingFee.toFixed(2)}`
                    )}
                  </Typography>
                </Stack>
                {baseListingFee > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Standard listing fee
                    </Typography>
                    <Typography variant="body2">
                      ${baseListingFee.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                {privateListingFee > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Private listing
                    </Typography>
                    <Typography variant="body2">
                      ${privateListingFee.toFixed(2)}
                    </Typography>
                  </Stack>
                )}
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Starting price {startingPriceNum > 999.99 ? <span style={{ fontSize: 12}}>(Customers are escrow eligible)</span> : ""}
                  </Typography>
                  <Typography variant="body2">
                    ${startingPriceNum.toLocaleString()}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" component="span">
                      Success fee if sold ({Math.round(successFeeRate * 100)}%)
                    </Typography>
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={() => setFeeTierBreakdownOpen(true)}
                      sx={{
                        minWidth: 0,
                        p: 0,
                        ml: 0.5,
                        verticalAlign: "baseline",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textDecoration: "underline",
                        color: BRAND_PALETTE.charcoal,
                        textTransform: "none",
                        "&:hover": {
                          textDecoration: "underline",
                          bgcolor: "transparent",
                          color: BRAND_PALETTE.seafoam,
                        },
                      }}
                    >
                      View tier breakdown
                    </Button>
                  </Box>
                  <Typography variant="body2">
                    $
                    {successFeeAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={700}>
                    You take home when it sells
                  </Typography>
                  <Typography fontWeight={800}>
                    $
                    {sellerTakeHome.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
            )}

            {stripeMissing && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                Add a default payment method in your wallet to pay the listing
                fee
                {needsPrivateFeeOnEdit
                  ? " ($4.99 private listing add-on)."
                  : isPrivateListing
                    ? " (includes $4.99 private listing)."
                    : "."}
              </Alert>
            )}

            {!formState.isValid && missingFields.length > 0 && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700} gutterBottom>
                  Almost there - finish these to enable submit:
                </Typography>
                <Stack
                  component="ul"
                  sx={{ m: 0, pl: 2.5, listStyle: "disc" }}
                  spacing={0.25}
                >
                  {missingFields.map((f) => (
                    <li key={f}>
                      <Typography variant="body2">{f}</Typography>
                    </li>
                  ))}
                </Stack>
              </Alert>
            )}

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              {!publishedEdit && (
              <>
              <Typography variant="subtitle2" color="text.secondary">
                payment method:
              </Typography>
            {paymentMethods?.hasCard && card && <Typography variant="subtitle2" color="text.secondary">
                  &bull;&bull;&bull;&bull; {card?.last4} - {card?.exp_month}/{card?.exp_year}
                  </Typography>}
                  {!paymentMethods?.hasCard && <Typography variant="subtitle2" color="text.secondary">
                    No payment method connected
                  </Typography>}
              </>
              )}
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "normal", sm: "center" }}
              justifyContent={{ xs: "normal", sm: "flex-end" }}
            >
              {!publishedEdit && (
              <Button
                variant="outlined"
                type="button"
                disabled={isSaveDrafting || isSubmitting || !auth.user?.id}
                onClick={() => void handleSaveDraft()}
                startIcon={
                  isSaveDrafting ? (
                    <CircularProgress size={16} sx={{ color: "inherit" }} />
                  ) : undefined
                }
                sx={{ borderRadius: 999, textTransform: "none" }}
              >
                Save draft
              </Button>
              )}

              <Button
                variant="contained"
                type="submit"
                disabled={!canSubmit}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={16} sx={{ color: "inherit" }} />
                  ) : undefined
                }
                sx={{
                  px: 3,
                  ...brandContainedButtonSx,
                  "&.Mui-disabled": {
                    backgroundColor: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                {isSubmitting
                  ? photoSlots.length > 0
                    ? "Uploading photos…"
                    : publishedEdit
                      ? "Saving…"
                      : "Submitting…"
                  : publishedEdit
                    ? "Save changes"
                    : listingFee === 0
                      ? "Submit listing · Free"
                      : `Submit listing · $${listingFee.toFixed(2)}`}
              </Button>
            </Stack>
          </Stack>
        </Paper>
        <Snackbar
          open={Boolean(submitError)}
          autoHideDuration={6000}
          onClose={() => setSubmitError(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity="error"
            onClose={() => setSubmitError(null)}
            sx={{ width: "100%" }}
          >
            {submitError}
          </Alert>
        </Snackbar>
      </Container>
      <ApplicationFeeTierBreakdownModal
        open={feeTierBreakdownOpen}
        onClose={() => setFeeTierBreakdownOpen(false)}
        currentPrice={startingPriceNum}
      />
      </>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {params.get("listed") === "1" && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Your listing was submitted - we&apos;ll review it and push it live within
            24 hours.
          </Alert>
        )}
        <Stack spacing={1}>
          <Typography variant="h3" fontWeight={900}>
            {meta.title}
          </Typography>
          <Typography color="text.secondary">{meta.subtitle}</Typography>

          <TextField
            placeholder="Search apps, creators, categories…"
            defaultValue={searchQuery || ""}
            sx={{ maxWidth: 520 }}
            InputProps={{
              sx: { borderRadius: 999 },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <Collection
          collectionName={
            category
              ? `${meta.title}`
              : searchQuery
              ? "Matching apps"
              : "Trending now"
          }
          subtitle={
            category
              ? "Ranked by installs this week."
              : "Most loved apps on Dap & Flip right now."
          }
          category={category || undefined}
          q={searchQuery || undefined}
          count={12}
          showAddCTA
        />

        {!category && !searchQuery && (
          <>
            <Collection
              collectionName="AI Tools"
              subtitle="Copilots, agents and LLM apps."
              category="ai-tools"
              count={8}
            />
            <Collection
              collectionName="Productivity"
              subtitle="Make your day 10× lighter."
              category="productivity"
              count={8}
            />
            <Collection
              collectionName="Games"
              subtitle="Weekend-sized fun."
              category="games"
              count={8}
            />
            <Collection
              collectionName="Dev Tools"
              subtitle="For builders who like shipping."
              category="dev-tools"
              count={8}
            />
          </>
        )}
      </Stack>

      <ApplicationFeeTierBreakdownModal
        open={feeTierBreakdownOpen}
        onClose={() => setFeeTierBreakdownOpen(false)}
        currentPrice={startingPriceNum}
      />
    </Container>
  );
}
