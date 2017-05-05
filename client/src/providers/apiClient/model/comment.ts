/**
 * vinimay
 * Vinimay is a decentralised social network focused on giving back control of its data to the user
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */



export interface Comment {
    /**
     * The comment's creation timestamp
     */
    creationTs: number;

    /**
     * The comment's last modification timestamp
     */
    lastEditTs: number;

    /**
     * The author of the comment
     */
    author: string;

    /**
     * The comment's content
     */
    content: string;

}
