// src/lib/ad-gating.ts
// Global ad-gating utility for PDFAIHUB

export interface AdConfig {
  adsEnabledForFreeUsers: boolean;
}

export const AD_CONFIG: AdConfig = {
  adsEnabledForFreeUsers: true, // Set to false to disable ads entirely
};

/**
 * Determines whether ads should be displayed to the user based on their subscription plan.
 * @param userPlan The current plan of the user ('FREE' | 'PRO' | undefined)
 * @returns true if ads should be displayed, false if ads are gated (PRO users or disabled globally)
 */
export function shouldShowAds(userPlan: string | undefined | null): boolean {
  // PRO users never see ads under any circumstances
  if (userPlan === 'PRO') {
    return false;
  }

  // Free/Guest users may see ads if they are enabled globally
  return AD_CONFIG.adsEnabledForFreeUsers;
}
