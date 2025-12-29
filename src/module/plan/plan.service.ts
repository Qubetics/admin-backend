import { RES_MSG, provWalletPrefix } from "../../constant";
import { convertNodeToWallet, fetchRequest, getOffset } from "../../Utility/common";
import { FETCH_METHODS } from "../../constant";
import logger from "../../lib/logger";

class PlanService {
  constructor() {}

  async getAllPlans(data: any): Promise<any> {
    try {
      const page = data.page;
      const limit = data.limit;
      const providerAddress = String(convertNodeToWallet(data.address, provWalletPrefix));
      let url = `${environment.evmHost}/qubetics/plan/v3/providers/${providerAddress}/plans`;

      if (page && limit) {
        const offset = getOffset(page, limit);
        url += `?pagination.offset=${offset}&pagination.limit=${limit}&pagination.reverse=${data.reverse}&pagination.count_total=true`;
      } else {
        url += `?pagination.reverse=${data.reverse}`;
      }

      const planResponse = await fetchRequest(url, FETCH_METHODS.GET);

      if (!planResponse || !planResponse.data?.plans) {
        return { error: true, message: RES_MSG.ERROR };
      }

      const plans = planResponse.data.plans;

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: plans ? plans : [],
        total: planResponse.data.pagination,
      };
    } catch (err) {
      logger.error("PlanService.getAllPlans error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }
}

export default new PlanService();
