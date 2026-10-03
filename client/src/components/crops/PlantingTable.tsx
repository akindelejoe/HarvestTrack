import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate, formatWindow } from '@/lib/format';
import type { Planting } from '@/types';
import { RiskBadge, StatusBadge } from '../ui/Badge';
import { CropTimeline, daysRemainingLabel } from './CropTimeline';

/** Compact data table on desktop; stacked cards on small screens. */
export function PlantingTable({ plantings, showFarm }: { plantings: Planting[]; showFarm?: boolean }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[13.5px]">
          <caption className="sr-only">Plantings with estimated harvest windows and status</caption>
          <thead>
            <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
              <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">Crop</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Field</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Planted</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Est. harvest window</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Days remaining</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Weather risk</th>
              <th scope="col" className="w-8 pr-4"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {plantings.map((p) => (
              <tr key={p.id} className="group relative border-b border-line/70 last:border-0 hover:bg-surface-2/60">
                <td className="py-3 pr-3 pl-5">
                  <Link to={`/app/crops/${p.id}`} className="font-medium text-ink after:absolute after:inset-0 focus-visible:outline-none group-focus-within:underline">
                    {p.crop.name}
                  </Link>
                  {p.variety && <div className="max-w-[180px] truncate text-[12px] text-ink-3">{p.variety}</div>}
                </td>
                <td className="px-3 py-3 text-ink-2">
                  {p.field.name}
                  {showFarm && <div className="text-[12px] text-ink-3">{p.farm.name}</div>}
                </td>
                <td className="num px-3 py-3 text-ink-2">{formatDate(p.plantingDate)}</td>
                <td className="num px-3 py-3 text-ink-2">{formatWindow(p.estimatedHarvestStart, p.estimatedHarvestEnd)}</td>
                <td className="px-3 py-3">
                  <div className="num font-medium text-ink">{daysRemainingLabel(p)}</div>
                  <div className="mt-1.5 w-28"><CropTimeline planting={p} compact /></div>
                </td>
                <td className="px-3 py-3"><StatusBadge status={p.displayStatus} /></td>
                <td className="px-3 py-3"><RiskBadge level={p.risk.level} /></td>
                <td className="pr-4 text-ink-3"><ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {plantings.map((p) => (
          <li key={p.id}>
            <Link to={`/app/crops/${p.id}`} className="block px-5 py-4 hover:bg-surface-2/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{p.crop.name}{p.variety && <span className="font-normal text-ink-3"> · {p.variety}</span>}</div>
                  <div className="text-[12.5px] text-ink-3">{p.field.name}{showFarm && ` · ${p.farm.name}`}</div>
                </div>
                <StatusBadge status={p.displayStatus} />
              </div>
              <div className="mt-3"><CropTimeline planting={p} compact /></div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                <dt className="text-ink-3">Est. window</dt>
                <dd className="num text-right text-ink-2">{formatWindow(p.estimatedHarvestStart, p.estimatedHarvestEnd)}</dd>
                <dt className="text-ink-3">Remaining</dt>
                <dd className="num text-right font-medium text-ink">{daysRemainingLabel(p)}</dd>
                <dt className="text-ink-3">Weather</dt>
                <dd className="flex justify-end"><RiskBadge level={p.risk.level} /></dd>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
