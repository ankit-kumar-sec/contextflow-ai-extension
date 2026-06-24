export class TokenCounter {
    count(text) {
        if (!text)
            return 0;
        const rough = Math.ceil(text.length / 4);
        return rough;
    }
}
export const tokenCounter = new TokenCounter();
