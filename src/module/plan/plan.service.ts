import { RES_MSG } from '../../constant';
import { fetchRequest } from '../../Utility/common';
import { FETCH_METHODS } from '../../constant';
import { RedisService } from '../../service';

class PlanService {
  constructor() {}

  async getAllPlans(data: any): Promise<any> {
    try {
      const page = data.page;
      const limit = data.limit;
      // const redisKey = `plans:page:${page}:limit:${limit}`;

      // const cached = await RedisService.getString(redisKey);
      // if (cached) {
      //   return {
      //     error: false,
      //     message: RES_MSG.FETCH_SUCCESS,
      //     data: cached,
      //   };
      // }

      const plansUrl = `${environment.evmHost}qubetics/plan/v3/plans`;
      const planResponse = await fetchRequest(plansUrl, FETCH_METHODS.GET);

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
        total: plans ? plans.length : 0
      };
      
    } catch (err) {
      console.error('PlanService.getAllPlans error:', err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }
}

export default new PlanService();
