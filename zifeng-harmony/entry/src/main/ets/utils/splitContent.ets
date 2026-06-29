export function calculateForLine(longText:string, maxCharactersPerPage:number):string[]{
  let pages:string[] = []
  let startIndex:number = 0;

  while (startIndex < longText.length) {
    let endIndex = Math.min(startIndex + maxCharactersPerPage, longText.length);
    while (endIndex < longText.length && !/\s/.test(longText.charAt(endIndex))) {
      endIndex++;
    }

    pages.push(longText.substring(startIndex, endIndex));

    startIndex = endIndex;
  }

  return pages;
}
