const inko = new Inko();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "replace") {
        replaceSelectedText();
    }
});

/**
 * 선택된 텍스트를 변환하고 커서를 설정하는 메인 함수
 */
function replaceSelectedText() {
    const selection = window.getSelection();
    if (!selection.rangeCount)
        return;

    const range = selection.getRangeAt(0);
    const originalText = range.toString();
    const convertedText = getReplacementText(originalText);
    const newRange = document.createRange();

    if (range.startContainer === range.endContainer)
        replaceTextWithinSameNode(range, originalText, convertedText, newRange);
    else
        replaceTextAcrossDifferentNodes(range, originalText, convertedText, newRange);

    updateSelectionRange(selection, newRange);
}

/**
 * 원본 텍스트를 다른 문자로 변환하여 반환한다.
 * @param {string} originalText 원본 텍스트
 * @returns {string} 변환된 텍스트
 */
function getReplacementText(originalText) {
    if (isAlphabet(originalText))
        return inko.en2ko(originalText);
    else if (isKorean(originalText))
        return inko.ko2en(originalText);

    // 변환이 필요 없으면 원본 텍스트 반환
    return originalText;
}

/**
 * 같은 노드 내에 있는 텍스트를 변환한다.
 * @param {Range} range 텍스트 선택 범위
 * @param {string} originalText 원본 텍스트
 * @param {string} convertedText 바꿀 텍스트
 * @param {Range} newRange 새로운 텍스트 선택 범위
 */
function replaceTextWithinSameNode(range, originalText, convertedText, newRange) {
    const startNode = range.startContainer;
    const startOffset = range.startOffset;

    replaceText(startNode, startOffset, originalText, convertedText);

    // 선택 범위를 변환된 크기에 맞게 조정
    setRange(newRange, startNode, startOffset, convertedText.length);
}

/**
 * 서로 다른 노드 사이에 걸쳐 있는 텍스트를 변환한다.
 * @param {Range} range 텍스트 선택 범위
 * @param {string} originalText 원본 텍스트
 * @param {string} convertedText 바꿀 텍스트
 * @param {Range} newRange 새로운 텍스트 선택 범위
 */
function replaceTextAcrossDifferentNodes(range, originalText, convertedText, newRange) {
    const parentNode = range.commonAncestorContainer;
    const walker = document.createTreeWalker(parentNode, NodeFilter.SHOW_TEXT, null, false);
    let startOffset = 0;

    while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.nodeName !== "text")
            continue;

        if (node === range.startContainer)
            break;

        startOffset += node.nodeValue.length;
    }
    startOffset += range.startOffset;

    replaceText(parentNode, startOffset, originalText, convertedText);

    // 선택 범위를 변환된 크기에 맞게 조정
    setRange(newRange, parentNode.firstChild, startOffset, convertedText.length);
}

/**
 * 노드 내의 originalText를 convertedText로 변환한다.
 * @param {Node} node 텍스트를 변환할 노드
 * @param {number} startOffset originalText가 시작하는 오프셋
 * @param {string} originalText 원본 텍스트
 * @param {string} convertedText 바꿀 텍스트
 */
function replaceText(node, startOffset, originalText, convertedText) {
    const totalText = node.textContent;
    node.textContent = totalText.slice(0, startOffset) + convertedText + totalText.slice(startOffset + originalText.length);
}

/**
 * 텍스트 선택 범위를 업데이트한다.
 * @param {Range} newRange 새로운 텍스트 선택 범위
 * @param {Node} container 새로운 선택 범위을 포함하는 노드
 * @param {number} startOffset 노드의 시작 오프셋
 * @param {number} length 범위의 길이
 */
function setRange(newRange, container, startOffset, length) {
    newRange.setStart(container, startOffset);
    newRange.setEnd(container, startOffset + length);
}

/**
 * 텍스트 선택 영역을 업데이트한다.
 * @param {Selection} selection 새로운 텍스트 선택 영역
 * @param {Range} newRange 새로운 텍스트 선택 범위
 */
function updateSelectionRange(selection, newRange) {
    selection.removeAllRanges();
    selection.addRange(newRange);
}

/**
 * 알파벳으로 끝나는 글자인지 판정한다.
 * 마지막 글자가 특수문자나 공백일 경우 이전 문자로 검사한다.
 * @param {string} str 판정할 문자열
 * @returns {boolean} 판정 여부
 */
function isAlphabet(str) {
    const regex = /[A-Za-z][^ㄱ-힣]*$/;
    return regex.test(str);
}

/**
 * 한글로 끝나는 글자인지 판정한다.
 * 마지막 글자가 특수문자나 공백일 경우 이전 문자로 검사한다.
 * @param {string} str 판정할 문자열
 * @returns {boolean} 판정 여부
 */
function isKorean(str) {
    const regex = /[ㄱ-힣][^A-Z^a-z]*$/;
    return regex.test(str);
}
