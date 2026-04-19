'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { UploadCloudIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/useT';

type FirmwareRelease = {
  _id: string;
  releaseId: string;
  version: string;
  filename: string;
  fileSize: number;
  filePath: string;
  changelog: string;
  uploadedBy: string;
  downloadCount: number;
  createdAt: string;
};

export default function DeployUpdatesPage() {
  const t = useT('deployUpdates');
  const tCommon = useT('common');
  const locale = useLocale();

  const [releases, setReleases] = useState<FirmwareRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [expandedReleaseIds, setExpandedReleaseIds] = useState<string[]>([]);
  const [releaseToDelete, setReleaseToDelete] = useState<FirmwareRelease | null>(null);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/firmware', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : `HTTP ${res.status}`);
      }

      const data = (await res.json()) as FirmwareRelease[];
      setReleases(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.load');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReleases();
  }, []);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.bin')) {
      toast.error(t('errors.invalidFile'));
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t('errors.fileRequired'));
      return;
    }

    if (!version.trim()) {
      toast.error(t('errors.versionRequired'));
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('version', version.trim());
    formData.append('changelog', changelog.trim());

    setUploading(true);
    setProgress(0);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/admin/firmware');
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }

          let errorMessage = t('errors.upload');
          try {
            const payload = JSON.parse(xhr.responseText) as { error?: string };
            if (typeof payload.error === 'string') {
              errorMessage = payload.error;
            }
          } catch {
            // keep default message
          }

          reject(new Error(errorMessage));
        };

        xhr.onerror = () => reject(new Error(t('errors.upload')));
        xhr.send(formData);
      });

      toast.success(t('toasts.uploaded'));
      setSelectedFile(null);
      setVersion('');
      setChangelog('');
      setProgress(0);
      await fetchReleases();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.upload');
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRelease = async () => {
    if (!releaseToDelete) return;

    try {
      const res = await fetch(`/api/admin/firmware/${releaseToDelete.releaseId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('errors.delete'));
      }

      toast.success(t('toasts.deleted'));
      setReleaseToDelete(null);
      await fetchReleases();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.delete');
      toast.error(message);
    }
  };

  const formatSizeKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));

  const releasesWithPreview = useMemo(() => {
    return releases.map((release) => {
      const expanded = expandedReleaseIds.includes(release.releaseId);
      const preview = release.changelog.length > 120 && !expanded
        ? `${release.changelog.slice(0, 120)}...`
        : release.changelog;

      return {
        ...release,
        expanded,
        preview,
      };
    });
  }, [expandedReleaseIds, releases]);

  const toggleExpanded = (releaseId: string) => {
    setExpandedReleaseIds((prev) =>
      prev.includes(releaseId) ? prev.filter((id) => id !== releaseId) : [...prev, releaseId]
    );
  };

  const downloadHref = (releaseId: string) => `/api/firmware/${releaseId}/download`;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/70 px-5 py-8 dark:bg-background sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-500">EauSure · Deploy</p>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-foreground">{t('title')}</h1>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">{t('uploadSection')}</h2>

        <label
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files.item(0);
            handleFileSelect(file);
          }}
        >
          <UploadCloudIcon className="h-10 w-10 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {selectedFile ? selectedFile.name : t('dropzone')}
          </span>
          <span className="text-xs text-muted-foreground">{t('onlyBin')}</span>
          <input
            type="file"
            accept=".bin"
            className="hidden"
            onChange={(event) => handleFileSelect(event.target.files?.item(0) || null)}
          />
        </label>

        {selectedFile ? (
          <p className="text-sm text-muted-foreground">
            {selectedFile.name} · {formatSizeKb(selectedFile.size)}
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="firmware-version">{t('version')}</label>
            <Input id="firmware-version" value={version} onChange={(event) => setVersion(event.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="firmware-changelog">{t('changelog')}</label>
          <Textarea
            id="firmware-changelog"
            value={changelog}
            onChange={(event) => setChangelog(event.target.value)}
            maxLength={2000}
            placeholder={t('changelogPlaceholder')}
            className="min-h-28"
          />
        </div>

        {uploading ? <Progress value={progress} /> : null}

        <div className="flex justify-end">
          <Button className="active:scale-95 transition-transform duration-100" onClick={() => void handleUpload()} disabled={uploading}>
            {uploading ? tCommon('loading') : t('uploadBtn')}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('releases')}</h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`release-skeleton-${index}`} className="h-28 rounded-2xl border bg-card" />
            ))}
          </div>
        ) : releasesWithPreview.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <UploadCloudIcon className="h-12 w-12 opacity-30" />
            <p className="text-sm">{t('noReleases')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {releasesWithPreview.map((release) => (
              <div key={release.releaseId} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{release.releaseId}</Badge>
                    <span className="text-lg font-semibold">{release.version}</span>
                  </div>
                  <Badge variant="secondary">{release.downloadCount} {t('downloads')}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {formatDate(release.createdAt)} · {formatSizeKb(release.fileSize)} · {t('uploadedBy')} {release.uploadedBy}
                </p>

                <div className="text-sm">
                  <p>
                    {t('changelog')}: {release.preview || '-'}
                  </p>
                  {release.changelog.length > 120 ? (
                    <button className="mt-1 text-xs text-primary hover:underline" onClick={() => toggleExpanded(release.releaseId)}>
                      {release.expanded ? t('showLess') : t('showMore')}
                    </button>
                  ) : null}
                </div>

                <div className="flex justify-end gap-2">
                  <Button asChild variant="outline">
                    <a href={downloadHref(release.releaseId)}>{t('download')}</a>
                  </Button>
                  <Button variant="destructive" className="active:scale-95 transition-transform duration-100" onClick={() => setReleaseToDelete(release)}>
                    {t('delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!releaseToDelete} onOpenChange={(open) => !open && setReleaseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('discard')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => void handleDeleteRelease()}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
