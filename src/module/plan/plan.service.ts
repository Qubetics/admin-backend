import { RES_MSG, provWalletPrefix } from "../../constant";
import { convertNodeToWallet, fetchRequest, getOffset } from "../../Utility/common";
import { FETCH_METHODS } from "../../constant";
// import { RedisService } from '../../service';

class PlanService {
  constructor() {}

  async getAllPlans(data: any): Promise<any> {
    try {
      const page = data.page;
      const limit = data.limit;
      const providerAddress = String(convertNodeToWallet(data.address, provWalletPrefix));
      let url = `${environment.evmHost}/qubetics/plan/v3/providers/${providerAddress}/plans`;
      // const redisKey = `plans:page:${page}:limit:${limit}`;

      // const cached = await RedisService.getString(redisKey);
      // if (cached) {
      //   return {
      //     error: false,
      //     message: RES_MSG.FETCH_SUCCESS,
      //     data: cached,
      //   };
      // }
      if (page && limit) {
        const offset = getOffset(page, limit);
        url += `?pagination.offset=${offset}&pagination.limit=${limit}&pagination.reverse=${data.reverse}&pagination.count_total=true`;
      } else {
        url += `?pagination.reverse=${data.reverse}`;
      }

      // const plansUrl = `${environment.evmHost}/qubetics/plan/v3/providers/${providerAddress}/plans?pagination.offset=${offset}&pagination.limit=${limit}&pagination.reverse=${data.reverse}&pagination.count_total=true`;
      const planResponse = await fetchRequest(url, FETCH_METHODS.GET);

      if (!planResponse || !planResponse.data?.plans) {
        return { error: true, message: RES_MSG.ERROR };
      }

      const plans = planResponse.data.plans;
      // const totalPages = Math.ceil(plans.length / limit);

      // for (let i = 1; i <= totalPages; i++) {
      //   const start = (i - 1) * limit;
      //   const end = start + limit;
      //   const chunk = plans.slice(start, end);

      //   const key = `plans:page:${i}:limit:${limit}`;
      //   await RedisService.setString(key, chunk, 3600);
      //   console.log(`Stored ${key} with ${chunk.length} items`);
      // }

      // const freshPage = await RedisService.getString(redisKey);
      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: plans ? plans : [],
        total: planResponse.data.pagination,
      };
    } catch (err) {
      console.error("PlanService.getAllPlans error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }
}

export default new PlanService();
