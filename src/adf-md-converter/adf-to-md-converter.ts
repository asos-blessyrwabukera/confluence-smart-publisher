/**
 * Main class responsible for converting ADF nodes to Markdown.
 * Traverses the ADF tree recursively and delegates conversion to specific converters.
 */
import { AdfNode, MarkdownBlock } from './types';
import { generateYamlBlock } from './utils';
import convertDoc from './converters/doc-converter';
import convertParagraph from './converters/paragraph-converter';
import convertHeading from './converters/heading-converter';
import convertTable from './converters/table-converter';
import convertTableRow from './converters/table-row-converter';
import convertTableHeader from './converters/table-header-converter';
import convertTableCell from './converters/table-cell-converter';
import convertText from './converters/text-converter';
import convertBulletList from './converters/bullet-list-converter';
import convertListItem from './converters/list-item-converter';
import convertOrderedList from './converters/ordered-list-converter';
import convertTaskList from './converters/task-list-converter';
import convertTaskItem from './converters/task-item-converter';
import convertStrong from './converters/strong-converter';
import convertCode from './converters/code-converter';
import convertLink from './converters/link-converter';
import convertBlockCard from './converters/block-card-converter';
import convertInlineCard from './converters/inline-card-converter';
import convertEmbedCard from './converters/embed-card-converter';
import convertCodeBlock from './converters/code-block-converter';
import convertRule from './converters/rule-converter';
import convertExpand from './converters/expand-converter';
import convertPanel from './converters/panel-converter';
import convertStatus from './converters/status-converter';
import convertDate from './converters/date-converter';
import convertEmoji from './converters/emoji-converter';
import convertMention from './converters/mention-converter';
import convertHardBreak from './converters/hard-break-converter';
import convertExtension from './converters/extension-converter';
import convertBodiedExtension from './converters/bodied-extension-converter';
import convertMathBlock from './converters/math-block-converter';

export class AdfToMarkdownConverter {
  /**
   * Converts a single ADF node to MarkdownBlock, processing children first.
   * @param node The ADF node to convert
   * @param level The nesting level (for lists)
   */
  async convertNode(node: AdfNode, level: number = 0, confluenceBaseUrl: string = ''): Promise<MarkdownBlock> {
    const children = await this.convertChildren(node, level, confluenceBaseUrl);
    const converter = this.getConverter(node.type);
    if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      return await Promise.resolve((converter as any)(node, children, level, confluenceBaseUrl));
    }
    return await Promise.resolve(converter(node, children, undefined, confluenceBaseUrl));
  }

  /**
   * Converts all children of a node (if any) to MarkdownBlocks.
   * @param node The parent ADF node
   * @param level The nesting level (for lists)
   */
  async convertChildren(node: AdfNode, level: number = 0, confluenceBaseUrl: string = ''): Promise<MarkdownBlock[]> {
    if (!Array.isArray(node.content)) {return [];} 
    // Para listas aninhadas, incrementa o nível
    return Promise.all(node.content.map(child =>
      (child.type === 'bulletList' || child.type === 'orderedList' || child.type === 'taskList')
        ? this.convertNode(child, level + 1, confluenceBaseUrl)
        : this.convertNode(child, level, confluenceBaseUrl)
    ));
  }

  /**
   * Returns the converter function for a given node type.
   * If not implemented, returns a function that puts the original node in the yamlBlock.
   * @param type Node type
   */
  getConverter(type: string): (node: AdfNode, children: MarkdownBlock[], level?: number, confluenceBaseUrl?: string) => Promise<MarkdownBlock> | MarkdownBlock {
    if (type === 'doc') {return convertDoc;}
    if (type === 'paragraph') {return convertParagraph;}
    if (type === 'heading') {return convertHeading;}
    if (type === 'table') {return convertTable;}
    if (type === 'tableRow') {return convertTableRow;}
    if (type === 'tableHeader') {return convertTableHeader;}
    if (type === 'tableCell') {return convertTableCell;}
    if (type === 'text') {return convertText;}
    if (type === 'bulletList') {return convertBulletList;}
    if (type === 'listItem') {return convertListItem;}
    if (type === 'orderedList') {return convertOrderedList;}
    if (type === 'taskList') {return convertTaskList;}
    if (type === 'taskItem') {return convertTaskItem;}
    if (type === 'strong') {return convertStrong;}
    if (type === 'code') {return convertCode;}
    if (type === 'link') {return convertLink;}
    if (type === 'blockCard') {return convertBlockCard;}
    if (type === 'inlineCard') {return convertInlineCard;}
    if (type === 'embedCard') {return convertEmbedCard;}
    if (type === 'codeBlock') {return convertCodeBlock;}
    if (type === 'rule') {return convertRule;}
    if (type === 'expand') {return convertExpand;}
    if (type === 'panel') {return convertPanel;}
    if (type === 'status') {return convertStatus;}
    if (type === 'date') {return convertDate;}
    if (type === 'emoji' || type === 'emoticon') {return convertEmoji;}
    if (type === 'mention') {return convertMention;}
    if (type === 'hardBreak') {return convertHardBreak;}
    if (type === 'extension') {return convertExtension;}
    if (type === 'bodiedExtension') {return convertBodiedExtension;}
    if (type === 'math' || type === 'mathBlock' || type === 'easy-math-block') {return convertMathBlock;}
    return (node, children) => ({
      yamlBlock: generateYamlBlock({ adfType: 'not-implemented', originalNode: node }),
      markdown: ''
    });
  }
}



