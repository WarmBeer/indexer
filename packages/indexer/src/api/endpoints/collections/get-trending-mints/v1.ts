/* eslint-disable @typescript-eslint/no-explicit-any */

import { redb } from "@/common/db";
import { logger } from "@/common/logger";
import { formatEth, regex } from "@/common/utils";
import { getStartTime } from "@/models/top-selling-collections/top-selling-collections";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { redis } from "@/common/redis";

const REDIS_EXPIRATION_MINTS = 120; // Assuming an hour, adjust as needed.

import { getTrendingMints } from "@/elasticsearch/indexes/activities";

import { getCollectionsMetadata } from "@/api/endpoints/collections/get-trending-collections/v1";
import {
  ElasticMintResult,
  Metadata,
  MetadataKey,
  Mint,
} from "@/api/endpoints/collections/get-trending-mints/interfaces";
import { JoiPrice, getJoiPriceObject } from "@/common/joi";
import { Sources } from "@/models/sources";

const version = "v1";

export const getTrendingMintsV1Options: RouteOptions = {
  description: "Top Trending Mints",
  notes: "Get top trending mints",
  tags: ["api", "mints"],
  plugins: {
    "hapi-swagger": {
      order: 3,
    },
  },
  validate: {
    query: Joi.object({
      period: Joi.string()
        .valid("5m", "10m", "30m", "1h", "2h", "6h", "24h")
        .default("24h")
        .description("Time window to aggregate."),
      type: Joi.string()
        .valid("free", "paid", "any")
        .default("any")
        .description("The type of the mint (free/paid)."),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(50)
        .description(
          "Amount of items returned in response. Default is 50 and max is 50. Expected to be sorted and filtered on client side."
        ),
    }),
  },
  response: {
    schema: Joi.object({
      mints: Joi.array().items(
        Joi.object({
          id: Joi.string().description("Collection id"),
          name: Joi.string().allow("", null),
          image: Joi.string().allow("", null),
          banner: Joi.string().allow("", null),
          isSpam: Joi.boolean().default(false),
          description: Joi.string().allow("", null),
          primaryContract: Joi.string().lowercase().pattern(regex.address),
          contract: Joi.string().lowercase().pattern(regex.address),
          count: Joi.number().integer(),
          volume: Joi.number(),
          volumePercentChange: Joi.number().unsafe().allow(null),
          countPercentChange: Joi.number().unsafe().allow(null),
          creator: Joi.string().allow("", null),
          onSaleCount: Joi.number().integer(),
          floorAsk: {
            id: Joi.string().allow(null),
            sourceDomain: Joi.string().allow("", null),
            price: JoiPrice.allow(null),
            maker: Joi.string().lowercase().pattern(regex.address).allow(null),
            validFrom: Joi.number().unsafe().allow(null),
            validUntil: Joi.number().unsafe().allow(null),
            token: Joi.object({
              contract: Joi.string().lowercase().pattern(regex.address).allow(null),
              tokenId: Joi.string().pattern(regex.number).allow(null),
              name: Joi.string().allow(null),
              image: Joi.string().allow("", null),
            })
              .allow(null)
              .description("Lowest Ask Price."),
          },
          tokenCount: Joi.number().description("Total tokens within the collection."),
          ownerCount: Joi.number().description("Unique number of owners."),

          createdAt: Joi.date().allow("", null),
          startDate: Joi.date().allow("", null),
          endDate: Joi.date().allow("", null),
          maxSupply: Joi.number().allow(null),
          mintPrice: Joi.number().allow(null),
          mintVolume: Joi.any(),
          mintCount: Joi.number().allow(null),
          mintType: Joi.string().allow("free", "paid", "", null),
          mintStatus: Joi.string().allow("", null),
          mintStages: Joi.array().items(
            Joi.object({
              stage: Joi.string().allow(null),
              tokenId: Joi.string().pattern(regex.number).allow(null),
              kind: Joi.string().required(),
              price: JoiPrice.allow(null),
              startTime: Joi.number().allow(null),
              endTime: Joi.number().allow(null),
              maxMintsPerWallet: Joi.number().unsafe().allow(null),
            })
          ),

          collectionVolume: Joi.object({
            "1day": Joi.number().unsafe().allow(null),
            "7day": Joi.number().unsafe().allow(null),
            "30day": Joi.number().unsafe().allow(null),
            allTime: Joi.number().unsafe().allow(null),
          }).description("Total volume in given time period."),

          volumeChange: Joi.object({
            "1day": Joi.number().unsafe().allow(null),
            "7day": Joi.number().unsafe().allow(null),
            "30day": Joi.number().unsafe().allow(null),
          }).description(
            "Total volume change X-days vs previous X-days. (e.g. 7day [days 1-7] vs 7day prior [days 8-14]). A value over 1 is a positive gain, under 1 is a negative loss. e.g. 1 means no change; 1.1 means 10% increase; 0.9 means 10% decrease."
          ),
        })
      ),
    }).label(`get-trending-mints${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(`get-trending-mints-${version}-handler`, `Wrong response schema: ${error}`);
      throw error;
    },
  },
  handler: async ({ query }: Request, h) => {
    const { normalizeRoyalties, useNonFlaggedFloorAsk, type, period, limit } = query;

    try {
      const mintingCollections = await getMintingCollections(type);

      const elasticMintData = await getTrendingMints({
        contracts: mintingCollections.map(({ collection_id }) => collection_id),
        startTime: getStartTime(period),
        limit,
      });

      const collectionsMetadata = await getCollectionsMetadata(elasticMintData, true);
      const mints = await formatCollections(
        mintingCollections,
        elasticMintData,
        collectionsMetadata,
        normalizeRoyalties,
        useNonFlaggedFloorAsk
      );

      const response = h.response({ mints });
      return response;
    } catch (error) {
      logger.error(`get-trending-mints-${version}-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

async function getMintingCollections(type: "paid" | "free" | "any"): Promise<Mint[]> {
  const cacheKey = `minting-collections-cache:v1:${type}`;

  const cachedResult = await redis.get(cacheKey);
  if (cachedResult) {
    return JSON.parse(cachedResult);
  }

  const conditions: string[] = [];
  conditions.push(`kind = 'public'`, `status = 'open'`);
  type && type !== "any" && conditions.push(`price ${type === "free" ? "= 0" : "> 0"}`);

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const baseQuery = `
SELECT 
    collection_id, start_time, end_time, created_at, updated_at, max_supply, max_mints_per_wallet, price
FROM 
    collection_mints 
${whereClause}
  `;

  const result = await redb.manyOrNone<Mint>(baseQuery);

  await redis.set(cacheKey, JSON.stringify(result), "EX", REDIS_EXPIRATION_MINTS);

  return result;
}

async function formatCollections(
  mintingCollections: Mint[],
  collectionsResult: ElasticMintResult[],
  collectionsMetadata: Record<string, Metadata>,
  normalizeRoyalties: boolean,
  useNonFlaggedFloorAsk: boolean
): Promise<any[]> {
  const sources = await Sources.getInstance();

  const collections = await Promise.all(
    collectionsResult.map(async (r) => {
      const mintData = mintingCollections.find((c) => c.collection_id == r.id);
      const metadata = collectionsMetadata[r.id];
      let floorAsk;
      let prefix = "";

      if (normalizeRoyalties) {
        prefix = "normalized_";
      } else if (useNonFlaggedFloorAsk) {
        prefix = "non_flagged_";
      }

      const floorAskId = metadata[(prefix + "floor_sell_id") as MetadataKey];
      const floorAskValue = metadata[(prefix + "floor_sell_value") as MetadataKey];
      const floorAskCurrency = metadata[(prefix + "floor_sell_currency") as MetadataKey];
      const floorAskSource = metadata[(prefix + "floor_sell_source_id_int") as MetadataKey];
      const floorAskCurrencyValue =
        metadata[(prefix + `${prefix}floor_sell_currency_value`) as MetadataKey];

      if (metadata) {
        floorAsk = {
          id: floorAskId,
          sourceDomain: sources.get(floorAskSource)?.domain,
          price: floorAskId
            ? await getJoiPriceObject(
                {
                  gross: {
                    amount: floorAskCurrencyValue ?? floorAskValue,
                    nativeAmount: floorAskValue || 0,
                  },
                },
                floorAskCurrency
              )
            : null,
        };
      }

      return {
        ...r,
        image: metadata?.metadata?.imageUrl,
        isSpam: Number(metadata.is_spam) > 0,
        name: metadata?.name || "",
        onSaleCount: Number(metadata.on_sale_count) || 0,
        volumeChange: {
          "1day": Number(metadata.day1_volume_change),
          "7day": Number(metadata.day7_volume_change),
          "30day": Number(metadata.day30_volume_change),
        },

        mintType: Number(mintData?.price) > 0 ? "paid" : "free",
        maxSupply: Number.isSafeInteger(mintData?.max_supply) ? mintData?.max_supply : null,
        createdAt: mintData?.created_at && new Date(mintData?.created_at).toISOString(),
        startDate: mintData?.start_time && new Date(mintData?.start_time).toISOString(),
        endDate: mintData?.end_time && new Date(mintData?.end_time).toISOString(),
        mintCount: r.count,
        mintVolume: r.volume,
        mintStages: metadata?.mint_stages
          ? await Promise.all(
              metadata.mint_stages.map(async (m: any) => {
                return {
                  stage: m?.stage || null,
                  kind: m?.kind || null,
                  tokenId: m?.tokenId || null,
                  price: m?.price
                    ? await getJoiPriceObject({ gross: { amount: m.price } }, m.currency)
                    : m?.price,
                  startTime: m?.startTime,
                  endTime: m?.endTime,
                  maxMintsPerWallet: m?.maxMintsPerWallet,
                };
              })
            )
          : [],

        collectionVolume: {
          "1day": metadata.day1_volume ? formatEth(metadata.day1_volume) : null,
          "7day": metadata.day7_volume ? formatEth(metadata.day7_volume) : null,
          "30day": metadata.day30_volume ? formatEth(metadata.day30_volume) : null,
          allTime: metadata.all_time_volume ? formatEth(metadata.all_time_volume) : null,
        },

        tokenCount: Number(metadata.token_count || 0),
        ownerCount: Number(metadata.owner_count || 0),
        banner: metadata?.metadata?.bannerImageUrl,
        description: metadata?.metadata?.description,
        floorAsk,
      };
    })
  );

  return collections;
}
