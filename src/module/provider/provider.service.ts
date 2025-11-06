import { fetchRequest, getOffset } from "../../Utility/common";
import { FETCH_METHODS, RES_MSG } from "../../constant";

class ProviderService {
  async getAllProvider(data: any): Promise<any> {
    try {
      const page = data.page;
      const limit = data.limit;
      
      let url = `${environment.evmHost}qubetics/provider/v2/providers`;

      if (page && limit) {
        const offset = getOffset(page, limit);
        url += `?pagination.offset=${offset}&pagination.limit=${limit}&pagination.reverse=false&pagination.count_total=true`;
      }
      const response = await fetchRequest(url, FETCH_METHODS.GET);

      if (!response) {
        return { error: true, message: RES_MSG.ERROR };
      }

      return {
        error: false,
        message: RES_MSG.FETCH_SUCCESS,
        data: { providers: response?.data?.providers || [] },
        total: response?.data?.pagination,
      };
    } catch (err) {
      console.error("get all provider error:", err);
      return { error: true, message: RES_MSG.ERROR };
    }
  }
}

export default new ProviderService();
