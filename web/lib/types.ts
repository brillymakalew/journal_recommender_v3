export interface Journal {
    id: string;
    name: string;
    scope: string;
    content: string;
    publisher?: string;
    link?: string;
    coverage?: string;
    asjc?: string;
    score?: number;
    embedding?: number[];
}

export interface SDG {
    id: number;
    name: string;
    keywords: string[];
    embedding?: number[];
    score?: number;
    matchReasons?: string[];
}

export interface AnalysisResult {
    journals: Journal[];
    sdgs: SDG[];
}
