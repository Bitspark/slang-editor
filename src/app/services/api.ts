import {BlueprintModel} from "../model/blueprint";

export class ApiService {

    constructor(private host: string = '') {
    }

    private fetch<T>(path: string, process: (_: any) => T, error: (error: any) => void): Promise<T> {
        return new Promise<T>((resolve) => {
            fetch(this.host + path)
                .then((resp: Response) => resp.json())
                .then((data: any) => resolve(process(data)))
                .catch(error);
        });


    }

    public async getBlueprints(): Promise<Array<BlueprintModel>> {
        return this.fetch<Array<BlueprintModel>>(
            '/operator',
            (data: any) => {
                const objects = (data as { objects: any }).objects;
                return objects.map((each: any) => new BlueprintModel(each.name))
            },
            (err: any) => console.error(err)
        );
    }

}
