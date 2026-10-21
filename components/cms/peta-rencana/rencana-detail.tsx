"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarAdd01Icon, Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { deferRencana, deleteRencana, undoDeferRencana } from "@/app/cms/peta-rencana/actions";
import { DetailDialog } from "@/components/blocks/detail-dialog";
import { Icon } from "@/components/icon";
import { RencanaBody, rencanaMeta } from "@/components/peta-rencana/rencana-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RencanaRecord } from "@/lib/types";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Pop-up kegiatan rencana: rincian, lalu aksi ubah, alihkan ke tahun berikutnya (dengan Urungkan), dan hapus. */
export function RencanaDetail({ record, canManage, onClose }: { record: RencanaRecord; canManage: boolean; onClose: () => void }) {
  const [busy, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const deferrable = record.status !== "terlaksana" && record.status !== "batal" && record.status !== "ditunda";

  const defer = () =>
    start(async () => {
      const result = await deferRencana(record.id);
      if (!result.ok) return void toast.error(result.error);
      const { newId, previous, year, period } = result.data;
      onClose();
      toast.success(`Dialihkan ke ${year}`, {
        description: period === record.period ? record.name : `${record.name} · periode ${period}`,
        action: {
          label: "Urungkan",
          onClick: async () => {
            const undo = await undoDeferRencana(record.id, newId, previous);
            if (undo.ok) toast("Pengalihan dibatalkan");
            else toast.error(undo.error);
          },
        },
      });
    });

  const remove = () =>
    start(async () => {
      const result = await deleteRencana(record.id);
      if (!result.ok) return void toast.error(result.error);
      onClose();
      toast.success("Kegiatan dihapus", { description: record.name });
    });

  return (
    <DetailDialog open onOpenChange={(open) => !open && onClose()} eyebrow={record.code} title={record.name} meta={<>{rencanaMeta(record)}{record.isSample && <Badge variant="muted">Data contoh</Badge>}</>}>
      <RencanaBody r={record} />
      <p className="text-xs text-muted-foreground">Diperbarui {date.format(new Date(record.updatedAt))}</p>
      {canManage && (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button asChild variant="outline">
            <Link href={`/cms/peta-rencana/${record.id}`}>
              <Icon icon={PencilEdit02Icon} size={16} />
              Ubah
            </Link>
          </Button>
          {deferrable && (
            <Button variant="outline" loading={busy} onClick={defer}>
              {!busy && <Icon icon={CalendarAdd01Icon} size={16} />}
              Alihkan ke {record.year + 1}
            </Button>
          )}
          <Button variant={confirm ? "destructive" : "ghost"} className="ml-auto" disabled={busy} onClick={() => (confirm ? remove() : setConfirm(true))} onBlur={() => setConfirm(false)}>
            <Icon icon={Delete02Icon} size={16} />
            {confirm ? "Klik lagi untuk menghapus" : "Hapus"}
          </Button>
        </div>
      )}
    </DetailDialog>
  );
}
