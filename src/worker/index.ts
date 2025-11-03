import cron from 'node-cron';
import { CRON_WORKER, Message } from '../constant';
import axios from 'axios';
import { saveNodeRequest, saveNodes, saveProvider } from '../helper/node.helper';

class Worker {
    public async startNodeWorker(): Promise<void> {
        try {
            cron.schedule('*/5 * * * *', async () => {  
                console.log(CRON_WORKER.NODE);
                const results = await this.fetchAndSave(`${environment.evmHost}/qubetics/node/v3/nodes`, saveNodes);

                //@ts-ignore
                results.forEach((result: any, index: number) => {
                    if (result.status === "rejected") {
                        console.error(
                            `Node  failed:`,
                            result.reason?.message || result.reason
                        );
                    } else {
                        console.log(` Node updated row(s))`);
                    }
                });
            });
        } catch (error) {

        }
    };
    // http://111.119.235.25:1317/qubetics/lease/v1/leases

    public async startWorker(): Promise<void> {
        try {
            cron.schedule('*/1 * * * *', async () => {  
                console.log(CRON_WORKER.PROVIDER);

                const response = await axios.get(`${environment.evmHost}/qubetics/provider/v2/providers`);
                const addressDetails=response?.data?.providers?.map(async(val:any)=> {
                    console.log(val?.address,"<<<<<<val?.address!!!")
                const response = await axios.get(`${environment.evmHost}/qubetics/plan/v3/providers/${val?.address}/plans`)
                    console.log(response?.data?.plans,"<<<<<<<addressDetails!!!!!")

                })
                // http://111.119.235.25:1317/qubetics/plan/v3/providers/${provAddress}/plans
                // http://111.119.235.25:1317/qubetics/node/v3/plans/${planId}/nodes



                // const response = await axios.get(`${environment.evmHost}/qubetics/lease/v1/leases`);
                // console.log(response.data.leases,"<<<<<response!!!!!!")
                // await saveNodeRequest(response.data.leases || [])
            });
        } catch (error) {

        }
    };


    public async startProviderWorker(): Promise<void> {
        try {
            cron.schedule('*/5 * * * *', async () => {  
                console.log(CRON_WORKER.PROVIDER);

                const response = await axios.get(`${environment.evmHost}/qubetics/provider/v2/providers`);
                await saveProvider(response?.data?.providers || [])
            });
        } catch (error) {

        }
    };

    private async fetchAndSave<T>(
        url: string,
        saveFunction: (data: T[]) => void
    ): Promise<void> {
        //try catch
        const response = await axios.get(url);

        const data = response.data?.nodes;
        if (!data) {
            throw new Error(`${Message.nodeFail} Response data missing`);
        }

        return await saveFunction(data);
    }
}

export default new Worker();