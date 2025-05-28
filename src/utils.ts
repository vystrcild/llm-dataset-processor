import { log } from 'apify';
import vm from 'vm';
import { CustomPreprocessingFunction } from './types.js';

export const parseCustomPreprocessingFunction = (funcString: string | undefined): CustomPreprocessingFunction => {
    if (!funcString?.trim()) {
        return (item) => item;
    }
    let func: (input: unknown) => unknown;
    try {
        func = vm.runInNewContext(funcString);
    } catch (err) {
        log.exception(err as Error, 'Cannot compile custom data function!');
        throw err;
    }

    if (typeof func !== 'function') {
        throw new Error('Custom preprocessing function is not a function!');
    }

    return (item: any) => {
        try {
            return func(item);
        } catch (error) {
            log.error(`Preprocessing function failed, returning the original item`, { error });
            return item;
        }
    };
};
