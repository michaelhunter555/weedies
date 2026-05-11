"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

import Collection from "@/components/Collections/Collection";
import { AuthContext } from "@/context/auth-context";
import { useForm } from "@/hooks/useForm";
import { useListings } from "@/hooks/use-listings";
import {
  CATEGORY_META,
  DIFFICULTY_OPTIONS,
  FLAT_LISTING_FEE,
  LISTING_CATEGORIES,
  TURNAROUND_OPTIONS,
  computeListingFee,
  determineApplicationFee,
} from "@/utils/listingOptions";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type {
  Listing,
  ListingCategory,
  ListingDifficulty,
  ListingTurnaround,
} from "../../../types";

const MAX_PHOTOS = 6;
// Mirror the backend multer limit so we reject giant files client-side
// before they ever leave the browser on submit.
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

type PhotoSlot = {
  id: string;
  /** the actual File; kept in-memory until the form is submitted */
  file: File;
  /** local blob preview (revoked on remove / unmount) */
  preview: string;
};

export default function ProductsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = useContext(AuthContext);

  const category = params.get("category");
  const listMode = params.get("list") === "new";
  const searchQuery = params.get("q");

  const [formState, inputHandler] = useForm(
    {
      appName: { value: "", isValid: false },
      tagline: { value: "", isValid: false },
      startingPrice: { value: 0, isValid: false },
      isBuyItNow: { value: false, isValid: true },
      buyItNowPrice: { value: 0, isValid: true },
      category: { value: "", isValid: false },
      turnaround: { value: "", isValid: false },
      difficulty: { value: "", isValid: false },
      ageOfBusiness: { value: 0, isValid: true },
      appDescription: { value: "", isValid: false },
      photos: { value: [], isValid: true },
      coverIndex: { value: 0, isValid: true },
      hasSalesToVerify: { value: false, isValid: true },
      hasAnalyticsToVerify: { value: false, isValid: true },
      agreeToTerms: { value: false, isValid: false },
      isAuction: { value: false, isValid: true },
      startDate: { value: new Date().toISOString(), isValid: true },
      endDate: { value: new Date().toISOString(), isValid: true },
    },
    false
  );

  const { uploadPhotos, createListing } = useListings();

  // ── Photo upload state ────────────────────────────────────────────────────
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Clamp cover index when slots shrink. We don't stash the file list in the
  // form reducer — the actual uploads happen at submit time, at which point
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
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((s) => s.id !== slotId);
    });
  };

  // Revoke any still-live blob URLs on unmount.
  useEffect(() => {
    return () => {
      photoSlots.forEach((s) => URL.revokeObjectURL(s.preview));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  const photoCount = photoSlots.length;

  const startingPriceNum = Number(formState?.inputs?.startingPrice?.value || 0);
  const isBuyItNow = Boolean(formState?.inputs?.isBuyItNow?.value);
  const buyItNowPriceNum = Number(formState?.inputs?.buyItNowPrice?.value || 0);

  const successFeeRate = determineApplicationFee(startingPriceNum);
  const successFeeAmount = Math.max(0, startingPriceNum * successFeeRate);
  const sellerTakeHome = Math.max(0, startingPriceNum - successFeeAmount);

  // First listing is free, $2.99 per listing after that.
  const priorListings = Number(auth.user?.totalListings ?? 0);
  const listingFee = computeListingFee(priorListings);
  const isFirstListing = priorListings <= 0;

  const selectedCategory = String(formState?.inputs?.category?.value || "");
  const selectedTurnaround = String(formState?.inputs?.turnaround?.value || "");
  const selectedDifficulty = String(formState?.inputs?.difficulty?.value || "");
  const hasSalesToVerify = Boolean(formState?.inputs?.hasSalesToVerify?.value);
  const hasAnalyticsToVerify = Boolean(
    formState?.inputs?.hasAnalyticsToVerify?.value
  );

  const { 
    appName,
    tagline,
    startingPrice,
    buyItNowPrice,
    turnaround,
    difficulty,
    ageOfBusiness,
    appDescription,
    isAuction,
    startDate,
    endDate,
    agreeToTerms,
  } = formState?.inputs;

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
    Number(auth?.user?.totalListings ?? 0) > 0 &&
    !auth?.user?.stripeCustomerId;

  const canSubmit =
    formState.isValid && !isSubmitting && !stripeMissing;

  const meta = useMemo(() => {
    if (!category) {
      return {
        title: searchQuery ? `Results for “${searchQuery}”` : "Discover apps",
        subtitle: searchQuery
          ? "Apps matching your search, ranked by community signal."
          : "Browse vibecoded apps across categories, creators and price tiers.",
      };
    }
    return (
      CATEGORY_META[category] || {
        title: category.charAt(0).toUpperCase() + category.slice(1),
        subtitle: "Curated apps from indie creators.",
      }
    );
  }, [category, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.isValid || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      // 1. Upload any selected photos now — this is the first (and only)
      //    time we touch the backend with them. Skips entirely if none.
      let uploadedUrls: string[] = [];
      if (photoSlots.length > 0) {
        try {
          uploadedUrls = await uploadPhotos(photoSlots.map((s) => s.file));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Photo upload failed";
          setSubmitError(`${message}. Please try again.`);
          return;
        }
      }

      const payload: Partial<Listing> = {
        appName: String(formState.inputs.appName?.value ?? ""),
        tagline: String(formState.inputs.tagline?.value ?? ""),
        appDescription: String(formState.inputs.appDescription?.value ?? ""),
        startingPrice: startingPriceNum,
        buyItNowPrice: isBuyItNow ? buyItNowPriceNum : undefined,
        category: selectedCategory as ListingCategory,
        turnaround: selectedTurnaround as ListingTurnaround,
        difficulty: selectedDifficulty as ListingDifficulty,
        ageOfBusinessMonths: Number(formState.inputs.ageOfBusiness?.value || 0),
        photos: uploadedUrls,
        coverIndex: Math.min(coverIndex, Math.max(0, uploadedUrls.length - 1)),
        hasSalesToVerify,
        hasAnalyticsToVerify,
        saleType: Boolean(formState?.inputs?.isAuction?.value)
          ? "auction"
          : "fixed",
      };

      const created = await createListing(payload);
      try {
        sessionStorage.setItem(
          "vibestack.pendingListing",
          JSON.stringify({
            ...payload,
            _id: created?._id,
            submittedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // storage may be unavailable (private mode etc.) — non-fatal
      }

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

  if (listMode) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper
          elevation={0}
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            background: "linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%)",
            border: "1px solid #eee",
          }}
        >
          <Stack spacing={2}>
            <Typography variant="overline" color="secondary" fontWeight={700}>
              Submit your app
            </Typography>
            <Typography variant="h3" fontWeight={900}>
              List your vibecoded app.
            </Typography>
            <Typography color="text.secondary">
              Tell us what you shipped — name, category, screenshots and a
              price. We'll review it and push it live within 24 hours.
            </Typography>
            <Alert severity={isFirstListing ? "success" : "info"}>
              <Typography variant="body2">
                {isFirstListing
                  ? "Your first listing is free on VibeStack. After that it's a flat $2.99 per listing."
                  : `Listing fee: $${FLAT_LISTING_FEE.toFixed(2)}. First listing is always free.`}
              </Typography>
            </Alert>

            <Alert severity="warning">
              <Typography variant="body2" color="text.secondary">
                Incomplete or not publicly accessible apps will be rejected.
              </Typography>
            </Alert>
            <Stack spacing={1} direction="row" alignItems="center">
              {/*
                Mutually-exclusive "Auction" vs "Sale" toggle. We always
                pass `true` for isValid — either option is a legitimate
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
              InputProps={{ sx: { borderRadius: 2 } }}
            />

            <TextField
              placeholder="One-line tagline (what does it do?)"
              fullWidth
              value={formState?.inputs?.tagline?.value || ""}
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

            {/* Category chips — matches homepage hero categories */}
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
                      color={selected ? "secondary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      sx={{ fontWeight: 600 }}
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
                How long you'll need to prepare all materials (code, credentials,
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
                      color={selected ? "secondary" : "default"}
                      variant={selected ? "filled" : "outlined"}
                      sx={{ fontWeight: 600 }}
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
            <FormControl>
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
                          borderColor: selected
                            ? "rgba(124,58,237,0.7)"
                            : "#ececec",
                          background: selected
                            ? "linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)"
                            : "#fff",
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="flex-start"
                        >
                          <Radio
                            checked={selected}
                            value={opt.value}
                            size="small"
                            sx={{ mt: -0.5 }}
                          />
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1.5,
                              background: "rgba(124,58,237,0.08)",
                              color: "#7c3aed",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {opt.icon}
                          </Box>
                          <Stack sx={{ flex: 1 }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Typography fontWeight={700}>
                                {opt.label}
                              </Typography>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={opt.summary}
                                sx={{ height: 20, fontSize: 10 }}
                              />
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.25 }}
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
                Add up to {MAX_PHOTOS} screenshots
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {photoCount}/{MAX_PHOTOS} selected
                {photoCount > 0 && " — click the star to set the cover"}
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
                      borderColor: isCover ? "#7c3aed" : undefined,
                      boxShadow: isCover
                        ? "0 0 0 2px rgba(124,58,237,0.35)"
                        : undefined,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slot.preview}
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
                          ? "#7c3aed"
                          : "rgba(255,255,255,0.85)",
                        color: isCover ? "#fff" : "#7c3aed",
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
                      borderColor: "#7c3aed",
                      color: "#7c3aed",
                      bgcolor: "rgba(124,58,237,0.04)",
                    },
                  }}
                >
                  <AddIcon />
                </Paper>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Up to 6 screenshots, 15MB each. Photos upload when you submit
              the listing — nothing leaves your browser until then.
            </Typography>

            {/* Business meta + long description */}
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
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            

            <TextField
              placeholder={`Describe your app in under 500 words.
 • What does it do?
 • Who is it for?
 • What makes it unique?
 • Key features & benefits
 • Advice for the next owner
 • Important information to know`}
              fullWidth
              multiline
              rows={6}
              value={formState?.inputs?.appDescription?.value || ""}
              onChange={(e) =>
                inputHandler(
                  "appDescription",
                  e.target.value,
                  e.target.value.trim().length >= 40
                )
              }
              InputProps={{ sx: { borderRadius: 2 } }}
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
                  <VerifiedRoundedIcon sx={{ color: "#7c3aed" }} />
                  <Typography fontWeight={700}>
                    Earn the Verified Sales &amp; Analytics badge
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Optional — connect RevenueCat, Stripe, Google Analytics or
                  similar after you submit. Listings with verified data sell
                  faster and for more.
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <Checkbox
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
                    I have <b>sales</b> data I can connect (Stripe, RevenueCat…)
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
                    I have <b>analytics</b> data I can connect (Google Analytics,
                    Mixpanel, Plausible…)
                  </Typography>
                </Stack>

                {(hasSalesToVerify || hasAnalyticsToVerify) && (
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

            <Typography variant="caption" color="text.secondary">
              By submitting you agree to VibeStack's creator terms. You keep
              90% of revenue on listings priced $1,000+.
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

            <Divider />

            {/* Summary + submit */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.6)",
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
                        Free · first listing
                      </Box>
                    ) : (
                      `$${listingFee.toFixed(2)}`
                    )}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Starting price
                  </Typography>
                  <Typography variant="body2">
                    ${startingPriceNum.toLocaleString()}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    VibeStack success fee ({Math.round(successFeeRate * 100)}%)
                  </Typography>
                  <Typography variant="body2">
                    −$
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
            {stripeMissing && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                Please connect your Stripe account to submit a listing.
              </Alert>
            )}

            {!formState.isValid && missingFields.length > 0 && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700} gutterBottom>
                  Almost there — finish these to enable submit:
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

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="flex-end"
            >
              <Button
                variant="outlined"
                type="button"
                sx={{ borderRadius: 999, textTransform: "none" }}
              >
                Save draft
              </Button>

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
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 700,
                  px: 3,
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                  boxShadow: "none",
                  "&.Mui-disabled": {
                    background: "#e5e7eb",
                    color: "#9ca3af",
                  },
                }}
              >
                {isSubmitting
                  ? photoSlots.length > 0
                    ? "Uploading photos…"
                    : "Submitting…"
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
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {params.get("listed") === "1" && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Your listing was submitted — we'll review it and push it live within
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
              : "Most loved apps on VibeStack right now."
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
    </Container>
  );
}
