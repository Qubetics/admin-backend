import { LINK, PENDING, RES_MSG, UNDEFINED, UNLINK } from "../../constant";

import prisma from "../../lib/db";

class ActivityService {
  constructor() {}

  public getActivityList = async (page: number, limit: number, address: any) => {
    try {
      const where: any = {};

      if (address) where.address = address;

      const options: any = { where };

      if (page && limit) {
        options.skip = (page - 1) * limit;
        options.take = limit;
      }

      const response = await prisma.activity.findMany(options);

      const total = await prisma.activity.count();

      return {
        error: false,
        data: {
          activityList: response,
          count: total,
        },
        message: RES_MSG.NODE_REQUESTLIST,
      };
    } catch (error) {
      return { error: true, message: RES_MSG.ERROR };
    }
  };
}

export default new ActivityService();
