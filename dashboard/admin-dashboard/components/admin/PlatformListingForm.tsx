"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";

import {
  createPlatformListing,
  updatePlatformListing,
  uploadPlatformListingPhotos,
} from "@/lib/admin-api";
import { AppDescriptionEditor } from "@/components/listings/AppDescriptionEditor";
import {
  isAppDescriptionValid,
  toEditorHtml,
} from "@/lib/sanitize-html";
import {
  PLATFORM_LISTING_CATEGORIES,
  PLATFORM_LISTING_DIFFICULTIES,
  PLATFORM_LISTING_PLATFORMS,
  PLATFORM_LISTING_SOCIAL_MEDIA,
  PLATFORM_LISTING_TURNAROUNDS,
  emptySocialUrls,
  type PlatformListingPlatform,
  type PlatformListingSocialMedia,
} from "@/lib/platform-listing-options";

type PlatformUrlRow = { platform: PlatformListingPlatform; url: string };
type SocialUrlRow = { platform: PlatformListingSocialMedia; url: string };

const emptyPlatformUrls = (): Record<PlatformListingPlatform, string> =>
  Object.fromEntries(
    PLATFORM_LISTING_PLATFORMS.map((p) => [p.value, ""]),
  ) as Record<PlatformListingPlatform, string>;

type Props = {
  mode?: "create" | "edit";
  listingId?: string;
  initialListing?: Record<string, unknown>;
};

function hydrateFromListing(listing: Record<string, unknown>) {
  const platformUrls = emptyPlatformUrls();
  const platforms: PlatformListingPlatform[] = [];
  for (const row of (listing.platformUrls as Array<{ platform?: string; url?: string }>) ??
    []) {
    const platform = row.platform as PlatformListingPlatform | undefined;
    if (!platform || !row.url) continue;
    platforms.push(platform);
    platformUrls[platform] = String(row.url);
  }

  const socialUrls = emptySocialUrls();
  const socialMedia: PlatformListingSocialMedia[] = [];
  for (const row of (listing.socialMediaUrls as Array<{ platform?: string; url?: string }>) ??
    []) {
    const platform = row.platform as PlatformListingSocialMedia | undefined;
    if (!platform || !row.url) continue;
    if (!socialMedia.includes(platform)) socialMedia.push(platform);
    socialUrls[platform] = String(row.url);
  }
  for (const platform of (listing.socialMedia as PlatformListingSocialMedia[]) ?? []) {
    if (!socialMedia.includes(platform)) socialMedia.push(platform);
  }

  const photos = Array.isArray(listing.photos)
    ? listing.photos.filter((p): p is string => typeof p === "string" && p.length > 0)
    : [];

  return {
    appName: String(listing.appName ?? ""),
    tagline: String(listing.tagline ?? ""),
    appDescription: toEditorHtml(String(listing.appDescription ?? "")),
    category: String(listing.category ?? "saas"),
    difficulty: String(listing.difficulty ?? "beginner"),
    turnaround: String(listing.turnaround ?? "1w"),
    ageOfBusinessMonths: String(listing.ageOfBusinessMonths ?? 0),
    startingPrice: String(
      listing.buyItNowPrice ?? listing.startingPrice ?? 0,
    ),
    monthlyRevenue:
      listing.monthlyRevenue != null ? String(listing.monthlyRevenue) : "",
    demoUrl: String(listing.demoUrl ?? ""),
    liveUrl: String(listing.liveUrl ?? ""),
    repoUrl: String(listing.repoUrl ?? ""),
    tags: Array.isArray(listing.tags) ? listing.tags.join(", ") : "",
    techStack: Array.isArray(listing.techStack) ? listing.techStack.join(", ") : "",
    platforms,
    platformUrls,
    socialMedia,
    socialUrls,
    photos,
    coverIndex: typeof listing.coverIndex === "number" ? listing.coverIndex : 0,
  };
}

export function PlatformListingForm({
  mode = "create",
  listingId,
  initialListing,
}: Props) {
  const isEdit = mode === "edit" && !!listingId;
  const router = useRouter();
  const [err, setErr] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [appName, setAppName] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [appDescription, setAppDescription] = React.useState("");
  const [descriptionValid, setDescriptionValid] = React.useState(false);
  const [category, setCategory] = React.useState("saas");
  const [difficulty, setDifficulty] = React.useState("beginner");
  const [turnaround, setTurnaround] = React.useState("1w");
  const [ageOfBusinessMonths, setAgeOfBusinessMonths] = React.useState("0");
  const [startingPrice, setStartingPrice] = React.useState("0");
  const [monthlyRevenue, setMonthlyRevenue] = React.useState("");
  const [demoUrl, setDemoUrl] = React.useState("");
  const [liveUrl, setLiveUrl] = React.useState("");
  const [repoUrl, setRepoUrl] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [techStack, setTechStack] = React.useState("");
  const [platforms, setPlatforms] = React.useState<PlatformListingPlatform[]>([]);
  const [platformUrls, setPlatformUrls] = React.useState(emptyPlatformUrls);
  const [socialMedia, setSocialMedia] = React.useState<PlatformListingSocialMedia[]>([]);
  const [socialUrls, setSocialUrls] = React.useState(emptySocialUrls);
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [coverIndex, setCoverIndex] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (!initialListing || hydratedRef.current) return;
    const state = hydrateFromListing(initialListing);
    setAppName(state.appName);
    setTagline(state.tagline);
    setAppDescription(state.appDescription);
    setDescriptionValid(isAppDescriptionValid(state.appDescription));
    setCategory(state.category);
    setDifficulty(state.difficulty);
    setTurnaround(state.turnaround);
    setAgeOfBusinessMonths(state.ageOfBusinessMonths);
    setStartingPrice(state.startingPrice);
    setMonthlyRevenue(state.monthlyRevenue);
    setDemoUrl(state.demoUrl);
    setLiveUrl(state.liveUrl);
    setRepoUrl(state.repoUrl);
    setTags(state.tags);
    setTechStack(state.techStack);
    setPlatforms(state.platforms);
    setPlatformUrls(state.platformUrls);
    setSocialMedia(state.socialMedia);
    setSocialUrls(state.socialUrls);
    setPhotos(state.photos);
    setCoverIndex(state.coverIndex);
    hydratedRef.current = true;
  }, [initialListing]);

  const togglePlatform = (value: PlatformListingPlatform) => {
    setPlatforms((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  };

  const toggleSocialMedia = (value: PlatformListingSocialMedia) => {
    setSocialMedia((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  };

  const normalizeSocialUrl = (
    raw: string,
    urlPrefix: string | undefined,
  ): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (urlPrefix) {
      const base = urlPrefix.replace(/\/$/, "");
      const path = trimmed.replace(/^\/+/, "");
      return `${base}/${path}`;
    }
    return `https://${trimmed.replace(/^\/+/, "")}`;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      const urls = await uploadPlatformListingPhotos(files);
      setPhotos((prev) => [...prev, ...urls].slice(0, 6));
    } catch (uploadErr) {
      setErr(uploadErr instanceof Error ? uploadErr.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const splitCsv = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!descriptionValid) {
      setErr("Description must be at least 40 characters and under 600 words.");
      return;
    }
    setSubmitting(true);
    try {
      const platformUrlRows: PlatformUrlRow[] = platforms
        .map((platform) => ({
          platform,
          url: platformUrls[platform]?.trim() ?? "",
        }))
        .filter((row) => row.url.length > 0);

      const socialMediaUrlRows: SocialUrlRow[] = socialMedia
        .map((platform) => {
          const meta = PLATFORM_LISTING_SOCIAL_MEDIA.find((p) => p.value === platform);
          return {
            platform,
            url: normalizeSocialUrl(
              socialUrls[platform] ?? "",
              meta && "urlPrefix" in meta ? meta.urlPrefix : undefined,
            ),
          };
        })
        .filter((row) => row.url.length > 0);

      const payload = {
        appName: appName.trim(),
        tagline: tagline.trim(),
        appDescription,
        category,
        difficulty,
        turnaround,
        ageOfBusinessMonths: Number(ageOfBusinessMonths) || 0,
        saleType: "fixed",
        startingPrice: Number(startingPrice) || 0,
        buyItNowPrice: Number(startingPrice) || 0,
        currency: "USD",
        photos,
        coverIndex,
        platforms,
        platformUrls: platformUrlRows,
        tags: splitCsv(tags),
        techStack: splitCsv(techStack),
        socialMedia,
        socialMediaUrls: socialMediaUrlRows,
        hasSalesToVerify: false,
        hasAnalyticsToVerify: false,
        verifiedProviders: [],
        ...(monthlyRevenue.trim()
          ? { monthlyRevenue: Number(monthlyRevenue) }
          : {}),
        ...(demoUrl.trim() ? { demoUrl: demoUrl.trim() } : {}),
        ...(liveUrl.trim() ? { liveUrl: liveUrl.trim() } : {}),
        ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
      };

      if (isEdit && listingId) {
        await updatePlatformListing(listingId, payload);
        router.push(`/admin/listings/${encodeURIComponent(listingId)}`);
        return;
      }

      const { listing } = await createPlatformListing(payload);
      const id = listing._id ? String(listing._id) : "";
      if (id) {
        router.push(`/admin/listings/${encodeURIComponent(id)}`);
        return;
      }
      router.push("/admin/listings");
    } catch (submitErr) {
      setErr(submitErr instanceof Error ? submitErr.message : isEdit ? "Update failed" : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
      <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {isEdit ? "Edit platform listing" : "Add platform listing"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isEdit
              ? "Update a live platform-owned listing. Changes appear on the storefront immediately."
              : "Creates a live listing under the platform owner account ("}
            {!isEdit ? (
              <>
                <code>ADMIN_CREATE_EMAIL</code>). No listing fee or Stripe Connect
                required. Buyer checkout works normally; payment stays on the platform
                Stripe account (100% platform revenue, like listing fees).
              </>
            ) : null}
          </Typography>
        </Box>

        {err ? <Alert severity="error">{err}</Alert> : null}

        <Stack spacing={2}>
          <TextField
            label="App name"
            required
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
          <TextField
            label="Tagline"
            required
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Description
            </Typography>
            <AppDescriptionEditor
              value={appDescription}
              onChange={(html, valid) => {
                setAppDescription(html);
                setDescriptionValid(valid);
              }}
            />
          </Box>
        </Stack>

        <Divider />

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(String(e.target.value))}
            >
              {PLATFORM_LISTING_CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>Difficulty</InputLabel>
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(String(e.target.value))}
            >
              {PLATFORM_LISTING_DIFFICULTIES.map((d) => (
                <MenuItem key={d.value} value={d.value}>
                  {d.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>Turnaround</InputLabel>
            <Select
              label="Turnaround"
              value={turnaround}
              onChange={(e) => setTurnaround(String(e.target.value))}
            >
              {PLATFORM_LISTING_TURNAROUNDS.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Business age (months)"
            type="number"
            inputProps={{ min: 0 }}
            value={ageOfBusinessMonths}
            onChange={(e) => setAgeOfBusinessMonths(e.target.value)}
          />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Price (USD)"
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            helperText="Fixed buy-now price. Buyers checkout at this amount."
          />
          <TextField
            label="Monthly revenue (optional)"
            type="number"
            inputProps={{ min: 0 }}
            value={monthlyRevenue}
            onChange={(e) => setMonthlyRevenue(e.target.value)}
          />
        </Stack>

        <Divider />

        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Platforms
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {PLATFORM_LISTING_PLATFORMS.map((p) => (
              <FormControlLabel
                key={p.value}
                control={
                  <Checkbox
                    checked={platforms.includes(p.value)}
                    onChange={() => togglePlatform(p.value)}
                  />
                }
                label={p.label}
              />
            ))}
          </Stack>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {platforms.map((platform) => {
              const label =
                PLATFORM_LISTING_PLATFORMS.find((p) => p.value === platform)
                  ?.label ?? platform;
              return (
                <TextField
                  key={platform}
                  label={`${label} URL`}
                  required
                  value={platformUrls[platform] ?? ""}
                  onChange={(e) =>
                    setPlatformUrls((prev) => ({
                      ...prev,
                      [platform]: e.target.value,
                    }))
                  }
                />
              );
            })}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Social media (optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Select accounts included in the sale. URLs show as clickable icons on the
            product page.
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {PLATFORM_LISTING_SOCIAL_MEDIA.map((p) => (
              <FormControlLabel
                key={p.value}
                control={
                  <Checkbox
                    checked={socialMedia.includes(p.value)}
                    onChange={() => toggleSocialMedia(p.value)}
                  />
                }
                label={p.label}
              />
            ))}
          </Stack>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {socialMedia.map((platform) => {
              const meta = PLATFORM_LISTING_SOCIAL_MEDIA.find((p) => p.value === platform);
              const prefix =
                meta && "urlPrefix" in meta ? meta.urlPrefix : undefined;
              return (
                <TextField
                  key={platform}
                  label={`${meta?.label ?? platform} URL`}
                  value={socialUrls[platform] ?? ""}
                  onChange={(e) =>
                    setSocialUrls((prev) => ({
                      ...prev,
                      [platform]: e.target.value,
                    }))
                  }
                  helperText={
                    prefix
                      ? `Full URL or path after ${prefix}`
                      : "Full URL (any social site)"
                  }
                />
              );
            })}
          </Stack>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Demo URL"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            fullWidth
          />
          <TextField
            label="Live URL"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            fullWidth
          />
          <TextField
            label="Repo URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
          />
          <TextField
            label="Tech stack (comma separated)"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            fullWidth
          />
        </Stack>

        <Divider />

        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Screenshots
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
            {photos.map((url, idx) => (
              <Chip
                key={url}
                label={idx === coverIndex ? `Cover ${idx + 1}` : `Photo ${idx + 1}`}
                color={idx === coverIndex ? "primary" : "default"}
                onClick={() => setCoverIndex(idx)}
                onDelete={() =>
                  setPhotos((prev) => {
                    const next = prev.filter((_, i) => i !== idx);
                    setCoverIndex((ci) =>
                      ci >= next.length ? Math.max(0, next.length - 1) : ci,
                    );
                    return next;
                  })
                }
              />
            ))}
          </Stack>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={handlePhotoUpload}
          />
          <Button
            variant="outlined"
            disabled={uploading || photos.length >= 6}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading..." : "Upload photos"}
          </Button>
          <FormHelperText sx={{ mt: 1 }}>
            Up to 6 images. At least one photo is required before publish.
          </FormHelperText>
        </Box>

        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button
            variant="text"
            onClick={() =>
              router.push(
                isEdit && listingId
                  ? `/admin/listings/${encodeURIComponent(listingId)}`
                  : "/admin/listings",
              )
            }
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              submitting ||
              !descriptionValid ||
              photos.length === 0 ||
              platforms.length === 0
            }
          >
            {submitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save changes"
                : "Create live listing"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
