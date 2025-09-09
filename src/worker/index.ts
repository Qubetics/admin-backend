import cron from 'node-cron';
import { CRON_WORKER, Message } from '../constant';
import axios from 'axios';
import saveNodes from '../helper/node.helper';

class Worker {
    public async startNodeWorker(): Promise<void> {
        try {
            console.log("start");
            cron.schedule('*/5 * * * *', async () => {
                console.log(CRON_WORKER);
                const results = await this.fetchAndSave(`${environment.evmHost}/qubetics/node/v3/nodes`, saveNodes);
                console.log("🚀 ~ Worker ~ startNodeWorker ~ results:", results);

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

    private async fetchAndSave<T>(
        url: string,
        saveFunction: (data: T[]) => void
    ): Promise<void> {
        //try catch
        const response = await axios.get(url);

        const data = response.data?.nodes;
        console.log("🚀 ~ Worker ~ fetchAndSave ~ data:", data)
        if (!data) {
            throw new Error(`${Message.nodeFail} Response data missing`);
        }

        return await saveFunction(data);
    }
}

export default new Worker();