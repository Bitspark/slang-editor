export interface PortApiResponse {
    type: "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic"
    map?: {
        [portName: string]: PortApiResponse,
    }
    stream?: PortApiResponse
    generic?: string
}

export interface BlueprintDefApiResponse {
    operators: {
        [operatorName: string]: {
            operator: string
        }
    }

    services: {
        [serviceName: string]: {
            in: PortApiResponse,
            out: PortApiResponse,
        }
    }
    
    connections: {
        [sourcePortReference: string]: [string]
    }
}

export interface BlueprintApiResponse {
    type: string,
    name: string,
    def: BlueprintDefApiResponse,
}

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

    public async getBlueprints(): Promise<Array<BlueprintApiResponse>> {
        return this.fetch<Array<BlueprintApiResponse>>(
            '/operator',
            (data: any) => {
                return (data as { objects: any }).objects.map((each: BlueprintApiResponse) => {
                    return each;
                });
            },
            (err: any) => console.error(err)
        );
    }

}
