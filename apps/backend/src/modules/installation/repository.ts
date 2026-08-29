import { prisma } from "../../core/database/prisma.js";
import { InstallationRecord, Prisma } from "@prisma/client";

export class InstallationRepository {
  public static async findByCampaignAndTester(
    campaignId: string,
    testerId: string,
  ): Promise<InstallationRecord | null> {
    return prisma.installationRecord.findUnique({
      where: {
        campaignId_testerId: {
          campaignId,
          testerId,
        },
      },
    });
  }

  public static async upsert(
    campaignId: string,
    testerId: string,
    createData: Prisma.InstallationRecordCreateInput,
    updateData: Prisma.InstallationRecordUpdateInput,
  ): Promise<InstallationRecord> {
    return prisma.installationRecord.upsert({
      where: {
        campaignId_testerId: {
          campaignId,
          testerId,
        },
      },
      create: createData,
      update: updateData,
    });
  }

  public static async listByCampaign(campaignId: string): Promise<InstallationRecord[]> {
    return prisma.installationRecord.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
  }
}
