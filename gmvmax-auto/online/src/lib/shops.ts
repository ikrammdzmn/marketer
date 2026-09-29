// Day-1 shop map (same as temp-marketplace route.ts:SHOPS).
// IDs are public routing identifiers, NOT secrets. Tokens stay in Vercel Env.
export interface ShopConfig {
  number: string;
  name: string;
  shopId: string;
  advertiserId: string;
  accessTokenEnv: string;
  hasGMVCampaigns: boolean;
}

export const SHOPS: Record<string, ShopConfig> = {
  "1": {
    number: "1",
    name: "Him.DrSamhan",
    shopId: "7495609155379170274",
    advertiserId: "7505228077656621057",
    accessTokenEnv: "TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN",
    hasGMVCampaigns: true,
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
