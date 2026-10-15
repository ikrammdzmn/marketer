// Day-1 shop map (same as temp-marketplace route.ts:SHOPS).
// IDs are public routing identifiers, NOT secrets. Tokens stay in Vercel Env.
export interface ShopConfig {
  number: string;
  name: string;
  shopId: string;
  advertiserId: string;
  accessTokenEnv: string;
  hasGMVCampaigns: boolean;
  // BC that authorizes this shop's store (for gmv_max/identity/get).
  // Shop 1 verified Oct 2026 via campaign/gmv_max/info (store_authorized_bc_id).
  // Shops without one skip the TT-account fill and stay bracket-grouped.
  storeBcId?: string;
}

export const SHOPS: Record<string, ShopConfig> = {
  "1": {
    number: "1",
    name: "Him.DrSamhan",
    shopId: "7495609155379170274",
    advertiserId: "7505228077656621057",
    accessTokenEnv: "TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN",
    hasGMVCampaigns: true,
    storeBcId: "7420347515893071888",
  },
  "2": {
    number: "2",
    name: "HIM CLINIC",
    shopId: "7495102143139318172",
    advertiserId: "7404387549454008336",
    accessTokenEnv: "TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN",
    hasGMVCampaigns: false,
  },
  "3": {
    number: "3",
    name: "Vigomax HQ",
    shopId: "7494799386964364219",
    advertiserId: "7259935704698929153",
    accessTokenEnv: "TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN",
    hasGMVCampaigns: true,
  },
  "4": {
    number: "4",
    name: "VigomaxPlus HQ",
    shopId: "7495580262600706099",
    advertiserId: "7259935704698929153",
    accessTokenEnv: "TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN",
    hasGMVCampaigns: true,
  },
};
