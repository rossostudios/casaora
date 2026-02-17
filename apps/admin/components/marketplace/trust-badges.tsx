import { SecurityCheckIcon, Tick01Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/ui/icon";

type TrustBadgesProps = {
  isTransparent: boolean;
  isEn: boolean;
};

export function TrustBadges({ isTransparent, isEn }: TrustBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {isTransparent ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <Icon icon={Tick01Icon} size={12} />
          {isEn ? "Transparent pricing" : "Precios transparentes"}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
        <Icon icon={SecurityCheckIcon} size={12} />
        {isEn ? "Verified listing" : "Anuncio verificado"}
      </span>
    </div>
  );
}
