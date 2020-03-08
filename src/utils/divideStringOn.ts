export const divideStringOn = (string: string, search: string) => {
    const index = string.indexOf(search);
    const first = string.slice(0, index);
    const rest = string.slice(index + search.length);
    return [first, rest];
}