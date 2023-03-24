import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import { assignRoyaltiesToFillEvents } from "@/events-sync/handlers/royalties";
import { getFillEventsFromTx } from "@/events-sync/handlers/royalties/utils";
import { jest, describe, it, expect } from "@jest/globals";
import { getRoyalties } from "@/utils/royalties";

jest.setTimeout(1000 * 1000);

jest.mock("@/utils/royalties");
const mockGetRoyalties = getRoyalties as jest.MockedFunction<typeof getRoyalties>;

jest.setTimeout(1000 * 1000);
jest.mock("@/utils/royalties");

describe("Royalties", () => {
  it("extract-case1", async () => {
    const { fillEvents } = await getFillEventsFromTx(
      "0xA2F1F678555F2CE4F87C7D45596429BFD844F7914B770C948261602C15EE0DB1"
    );

    const testCollectionRoyalties = [
      {
        collection: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        data: [
          {
            bps: 250,
            recipient: "0xaae7ac476b117bccafe2f05f582906be44bc8ff1",
          },
          {
            bps: 250,
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
          },
        ],
      },
    ];

    mockGetRoyalties.mockImplementation(async (contract: string) => {
      const matched = testCollectionRoyalties.find((c) => c.collection === contract);
      return matched?.data ?? [];
    });

    const feesList = [
      {
        contract: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        tokenId: "5449",
        royaltyFeeBps: 0,
        marketplaceFeeBps: 450,
      },
    ];
    await assignRoyaltiesToFillEvents(fillEvents, false, true);
    for (let index = 0; index < fillEvents.length; index++) {
      const fillEvent = fillEvents[index];
      const matchFee = feesList.find(
        (c) => c.contract === fillEvent.contract && c.tokenId === fillEvent.tokenId
      );
      if (matchFee) {
        expect(fillEvent.royaltyFeeBps).toEqual(matchFee.royaltyFeeBps);
        expect(fillEvent.marketplaceFeeBps).toEqual(matchFee.marketplaceFeeBps);
      }
    }
  });

  it("multiple-sales-one-call-and-same-royaltie", async () => {
    const { fillEvents } = await getFillEventsFromTx(
      "0x92F4F9B71BD3E655F43E7F9C1DCA4EE85F7EF37B7BEDE67B652C5D5A8F6402EF"
    );

    const testCollectionRoyalties = [
      {
        collection: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        data: [
          {
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
            bps: 250,
          },
        ],
      },
      {
        collection: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        data: [
          {
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
            bps: 250,
          },
        ],
      },
    ];

    mockGetRoyalties.mockImplementation(async (contract: string) => {
      const matched = testCollectionRoyalties.find((c) => c.collection === contract);
      return matched?.data ?? [];
    });

    const feesList = [
      {
        contract: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        tokenId: "5766",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 50,
      },
      {
        contract: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        tokenId: "8474",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 50,
      },
      {
        contract: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        tokenId: "2897",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        tokenId: "15323",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 250,
      },
    ];
    await assignRoyaltiesToFillEvents(fillEvents, false, true);
    for (let index = 0; index < fillEvents.length; index++) {
      const fillEvent = fillEvents[index];
      const matchFee = feesList.find(
        (c) => c.contract === fillEvent.contract && c.tokenId === fillEvent.tokenId
      );
      if (matchFee) {
        expect(fillEvent.royaltyFeeBps).toEqual(matchFee.royaltyFeeBps);
        expect(fillEvent.marketplaceFeeBps).toEqual(matchFee.marketplaceFeeBps);
      }
    }
  });

  it("case-3", async () => {
    const { fillEvents } = await getFillEventsFromTx(
      "0x1D51F3EDABF2FDA8423BD94C905BBC3D7574CEF76B99E8C200E4317BAB086FFC"
    );

    const testCollectionRoyalties = [
      {
        collection: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        data: [
          {
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
            bps: 250,
          },
        ],
      },
      {
        collection: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        data: [
          {
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
            bps: 250,
          },
        ],
      },
    ];

    mockGetRoyalties.mockImplementation(async (contract: string) => {
      const matched = testCollectionRoyalties.find((c) => c.collection === contract);
      return matched?.data ?? [];
    });

    const feesList = [
      {
        contract: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        tokenId: "5766",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 50,
      },
      {
        contract: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        tokenId: "8474",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 50,
      },
      {
        contract: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        tokenId: "2897",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
        tokenId: "15323",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 250,
      },
    ];
    await assignRoyaltiesToFillEvents(fillEvents, false, true);
    for (let index = 0; index < fillEvents.length; index++) {
      const fillEvent = fillEvents[index];
      const matchFee = feesList.find(
        (c) => c.contract === fillEvent.contract && c.tokenId === fillEvent.tokenId
      );
      if (matchFee) {
        expect(fillEvent.royaltyFeeBps).toEqual(matchFee.royaltyFeeBps);
        expect(fillEvent.marketplaceFeeBps).toEqual(matchFee.marketplaceFeeBps);
      }
    }
  });

  it("erc1155-multiple-sales", async () => {
    const { fillEvents } = await getFillEventsFromTx(
      "0x54a3b6a7ab7dd3f9f1df3ad3b0b2e274a40ae991bb5d4378287899e744082c45"
    );

    const testCollectionRoyalties = [
      {
        collection: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        data: [
          {
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
            bps: 250,
          },
        ],
      },
    ];

    mockGetRoyalties.mockImplementation(async (contract: string) => {
      const matched = testCollectionRoyalties.find((c) => c.collection === contract);
      return matched?.data ?? [];
    });

    const feesList = [
      {
        contract: "0x33fd426905f149f8376e227d0c9d3340aad17af1",
        tokenId: "54",
        royaltyFeeBps: 690,
        marketplaceFeeBps: 250,
      },
    ];
    await assignRoyaltiesToFillEvents(fillEvents, false, true);
    for (let index = 0; index < fillEvents.length; index++) {
      const fillEvent = fillEvents[index];
      const matchFee = feesList.find(
        (c) => c.contract === fillEvent.contract && c.tokenId === fillEvent.tokenId
      );
      if (matchFee) {
        expect(fillEvent.royaltyFeeBps).toEqual(matchFee.royaltyFeeBps);
        expect(fillEvent.marketplaceFeeBps).toEqual(matchFee.marketplaceFeeBps);
      }
    }
  });

  it("multiple-sales-with-wrong", async () => {
    const { fillEvents } = await getFillEventsFromTx(
      "0x02d831e6e0f967fbfc0975935c7ed35c328961c39373c0656ea17093106cd760"
    );

    const testCollectionRoyalties = [
      {
        collection: "0x5bd815fd6c096bab38b4c6553cfce3585194dff9",
        data: [
          {
            bps: 500,
            recipient: "0xdcaae62542aa20e6a8243b2407f18ddb36e83014",
          },
        ],
      },
      {
        collection: "0xb32979486938aa9694bfc898f35dbed459f44424",
        data: [
          {
            bps: 1000,
            recipient: "0x6d4219003714632c88b3f01d8591bee545f33184",
          },
        ],
      },
      {
        collection: "0x33fd426905f149f8376e227d0c9d3340aad17af1",
        data: [
          {
            bps: 690,
            recipient: "0x1b1289e34fe05019511d7b436a5138f361904df0",
          },
        ],
      },
    ];

    mockGetRoyalties.mockImplementation(async (contract: string) => {
      const matched = testCollectionRoyalties.find((c) => c.collection === contract);
      return matched?.data ?? [];
    });

    const feesList = [
      {
        contract: "0x33fd426905f149f8376e227d0c9d3340aad17af1",
        tokenId: "8",
        royaltyFeeBps: 690,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0xb32979486938aa9694bfc898f35dbed459f44424",
        tokenId: "10055",
        royaltyFeeBps: 1000,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0x5bd815fd6c096bab38b4c6553cfce3585194dff9",
        tokenId: "13055",
        royaltyFeeBps: 500,
        marketplaceFeeBps: 250,
      },
    ];
    await assignRoyaltiesToFillEvents(fillEvents, false, true);
    for (let index = 0; index < fillEvents.length; index++) {
      const fillEvent = fillEvents[index];
      const matchFee = feesList.find(
        (c) => c.contract === fillEvent.contract && c.tokenId === fillEvent.tokenId
      );
      if (matchFee) {
        expect(fillEvent.royaltyFeeBps).toEqual(matchFee.royaltyFeeBps);
        expect(fillEvent.marketplaceFeeBps).toEqual(matchFee.marketplaceFeeBps);
      }
    }
  });

  it("multiple-sales-case-1", async () => {
    const { fillEvents } = await getFillEventsFromTx(
      "0x67533A3C28F93589B9899E2A822F3658ADF8AA9E754D807FBA0E80A46CA0C7D4"
    );

    const testCollectionRoyalties = [
      {
        collection: "0x5bd815fd6c096bab38b4c6553cfce3585194dff9",
        data: [
          {
            bps: 500,
            recipient: "0xdcaae62542aa20e6a8243b2407f18ddb36e83014",
          },
        ],
      },
      {
        collection: "0xb32979486938aa9694bfc898f35dbed459f44424",
        data: [
          {
            bps: 1000,
            recipient: "0x6d4219003714632c88b3f01d8591bee545f33184",
          },
        ],
      },
      {
        collection: "0x33fd426905f149f8376e227d0c9d3340aad17af1",
        data: [
          {
            bps: 690,
            recipient: "0x1b1289e34fe05019511d7b436a5138f361904df0",
          },
        ],
      },
    ];

    mockGetRoyalties.mockImplementation(async (contract: string) => {
      const matched = testCollectionRoyalties.find((c) => c.collection === contract);
      return matched?.data ?? [];
    });

    const feesList = [
      {
        contract: "0x33fd426905f149f8376e227d0c9d3340aad17af1",
        tokenId: "8",
        royaltyFeeBps: 690,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0xb32979486938aa9694bfc898f35dbed459f44424",
        tokenId: "10055",
        royaltyFeeBps: 1000,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0x5bd815fd6c096bab38b4c6553cfce3585194dff9",
        tokenId: "13055",
        royaltyFeeBps: 500,
        marketplaceFeeBps: 250,
      },
    ];
    await assignRoyaltiesToFillEvents(fillEvents, false, true);
    for (let index = 0; index < fillEvents.length; index++) {
      const fillEvent = fillEvents[index];
      const matchFee = feesList.find(
        (c) => c.contract === fillEvent.contract && c.tokenId === fillEvent.tokenId
      );
      if (matchFee) {
        expect(fillEvent.royaltyFeeBps).toEqual(matchFee.royaltyFeeBps);
        expect(fillEvent.marketplaceFeeBps).toEqual(matchFee.marketplaceFeeBps);
      }
    }
  });

  it("multiple-sales-case-2", async () => {
    const { fillEvents } = await getFillEventsFromTx(
      "0x97d65878fafc3e5ffe4ce1e288125bb84b4734004dc7d8575d4163fb13457a8d"
    );

    const testCollectionRoyalties = [
      {
        collection: "0xba30e5f9bb24caa003e9f2f0497ad287fdf95623",
        data: [
          {
            bps: 250,
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
          },
        ],
      },
      {
        collection: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        data: [
          {
            bps: 250,
            recipient: "0xa858ddc0445d8131dac4d1de01f834ffcba52ef1",
          },
          {
            bps: 250,
            recipient: "0xaae7ac476b117bccafe2f05f582906be44bc8ff1",
          },
        ],
      },
    ];

    mockGetRoyalties.mockImplementation(async (contract: string) => {
      const matched = testCollectionRoyalties.find((c) => c.collection === contract);
      return matched?.data ?? [];
    });

    const feesList = [
      {
        contract: "0xba30e5f9bb24caa003e9f2f0497ad287fdf95623",
        tokenId: "8272",
        royaltyFeeBps: 0,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
        tokenId: "5300",
        royaltyFeeBps: 250,
        marketplaceFeeBps: 250,
      },
      {
        contract: "0x5bd815fd6c096bab38b4c6553cfce3585194dff9",
        tokenId: "13055",
        royaltyFeeBps: 500,
        marketplaceFeeBps: 250,
      },
    ];
    await assignRoyaltiesToFillEvents(fillEvents, false, true);
    for (let index = 0; index < fillEvents.length; index++) {
      const fillEvent = fillEvents[index];
      const matchFee = feesList.find(
        (c) => c.contract === fillEvent.contract && c.tokenId === fillEvent.tokenId
      );
      if (matchFee) {
        expect(fillEvent.royaltyFeeBps).toEqual(matchFee.royaltyFeeBps);
        expect(fillEvent.marketplaceFeeBps).toEqual(matchFee.marketplaceFeeBps);
      }
    }
  });
});
