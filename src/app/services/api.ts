import {BlueprintModel, BlueprintType} from "../model/blueprint";

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
                return objects.map((each: any) => {
                    let type: BlueprintType | null = null;
                    switch (each.type) {
                        case 'local':
                            type = BlueprintType.Local;
                            break;
                        case 'library':
                            type = BlueprintType.Library;
                            break;
                        case 'elementary':
                            type = BlueprintType.Elementary;
                            break;
                    }
                    if (type !== null) {
                        return new BlueprintModel(each.name, type);
                    } else {
                        throw `unknown blueprint type '${each.type}'`;
                    }
                })
            },
            (err: any) => console.error(err)
        );
    }

}
