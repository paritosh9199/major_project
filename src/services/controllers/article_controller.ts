import _ from "lodash"

import "../../database/models/article"

// eslint-disable-next-line no-unused-vars
import { Request, Response } from "express"
import logger, { Level } from "../../lib/logger"
import { responseMessageCreator } from "../../lib/response_message_creator"
import Article, { ArticleType } from "../../database/models/article"
import { v4 } from "uuid"
import User from "../../database/models/user"

export enum CommunityArticleQuery {
    LATEST,
    FEATURED,
    POPULAR
}
export const createArticle = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {
        let body = _.pick(req.body, ["title", "content", "preview", "article_banner", "community_id", "tags"])

        if (body.title == null) {
            res.status(400).send(responseMessageCreator("Invalid article title", 0))
        } else if (body.title.length > 150) {
            res.status(400).send(responseMessageCreator("Invalid article title", 0))
        } else if (body.content == null) {
            res.status(400).send(responseMessageCreator("Invalid article content", 0))
        } else if (body.preview == null) {
            res.status(400).send(responseMessageCreator("Invalid article preview", 0))
        } else {


            let d: any = new Object()

            d.title = body.title
            d.content = body.content
            d.preview = body.preview

            if (body.tags) {
                if (body.tags.length > 0 && Array.isArray(body.tags)) {
                    body.tags = body.tags.map((i: any) => {
                        return {
                            tag: i,
                            added_on: Date.now()
                        }
                    })

                    d.tags = body.tags
                }
            }

            let article = {
                ...d,
                "created_on": Date.now(),
                "article_id": `article.${v4()}`,
                "article_banner": (body.article_banner) ? body.article_banner : "NA",
                "author_id": req.user.user_id,
                "community_id": (!body.community_id) ? "NA" : body.community_id,
                "belongs_to_community": (!body.community_id) ? 0 : 1,
            }
            let articleInstance = new Article(article) // document


            articleInstance.save(function (err, doc) {
                if (err) {
                    logger(err)
                    res.status(400).send(responseMessageCreator("Error occured", 0))
                } else {
                    logger("Article is saved in database sucessfully!")
                    res.send(responseMessageCreator({ data: doc, status: "Article saved successfully!" }, 1))
                }
            })
        }
    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}

export const getArticleById = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {
        let body = _.pick(req.body, ["article_id"])

        if (body.article_id == null) {
            res.status(400).send(responseMessageCreator("Invalid article id", 0))
        } else {
            Article.findOne({
                article_id: body.article_id
            }).then((doc: any) => {
                if (doc) {
                    console.log(doc)
                    res.send(responseMessageCreator({ data: doc }))
                } else {
                    res.status(400).send(responseMessageCreator("No Article found", 0))
                }
            })
        }
    } else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}
export const getArticlesByUserId = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {

        let body = _.pick(req.body, ["author_id", "page", "limit"])

        if (body.author_id == null) {
            res.status(400).send(responseMessageCreator("Invalid author id", 0))
        } else {

            if (body.page == null || isNaN(body.page)) {
                body.page = 0
            }

            if (body.limit == null || isNaN(body.limit)) {
                body.limit = 10
            }

            let query = []

            query.push({ $match: { author_id: body.author_id } })
            query.push({ $skip: (+body.page) * 10 })
            query.push({ $limit: +body.limit })
            query.push({ $sort: { _id: -1 } })

            // query.push({
            //     $lookup: {
            //         from: "users",
            //         localField: "author_id",
            //         foreignField: "user_id",
            //         as: "author_details"
            //     }
            // })

            Article.aggregate(query).then((doc: any) => {
                if (doc) {
                    doc = doc.map((item: any) => {

                        let d = _.pick(item, ["created_on",
                            "article_id",
                            "article_banner",
                            "views",
                            "community_id",
                            "belongs_to_community",
                            "moderation_status",
                            "duration_of_article",
                            "title",
                            "preview",
                            "likes",
                            "tags",
                        ])

                        // let author_details = {
                        //     fullname: item.author_details[0].details.fullname,
                        //     username: item.author_details[0].details.username,
                        //     user_id: item.author_details[0].user_id,
                        //     profile_image_link: item.author_details[0].details.profile_image_link
                        // }

                        d.likes = (d.likes) ? d.likes.length : 0

                        return {
                            ...d
                        }
                    })

                    res.send(responseMessageCreator({ data: doc }))
                } else {
                    res.send(responseMessageCreator("Error", 0))
                }
            })
        }

    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}

export const getArticlesByUsername = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {

        let body = _.pick(req.body, ["username", "page", "limit"])

        body.username = req.params.username
        if (body.username == null) {
            res.status(400).send(responseMessageCreator("Invalid username", 0))
        } else {

            User.findOne({
                "details.username": body.username
            }).then((doc) => {
                if (doc) {
                    let author_id = doc?.user_id

                    if (body.page == null || isNaN(body.page)) {
                        body.page = 0
                    }

                    if (body.limit == null || isNaN(body.limit)) {
                        body.limit = 10
                    }

                    let query = []

                    query.push({ $match: { author_id: author_id } })
                    query.push({ $skip: (+body.page) * 10 })
                    query.push({ $limit: +body.limit })
                    query.push({ $sort: { _id: -1 } })


                    Article.aggregate(query).then((result: any) => {
                        if (result) {
                            result = result.map((item: any) => {

                                let d = _.pick(item, ["created_on",
                                    "article_id",
                                    "article_banner",
                                    "views",
                                    "community_id",
                                    "belongs_to_community",
                                    "moderation_status",
                                    "duration_of_article",
                                    "title",
                                    "preview",
                                    "likes",
                                    "tags",
                                ])

                                // let author_details = {
                                //     fullname: item.author_details[0].details.fullname,
                                //     username: item.author_details[0].details.username,
                                //     user_id: item.author_details[0].user_id,
                                //     profile_image_link: item.author_details[0].details.profile_image_link
                                // }

                                d.likes = (d.likes) ? d.likes.length : 0

                                return {
                                    ...d
                                }
                            })

                            res.send(responseMessageCreator({
                                data: result,
                                user: {
                                    fullname: doc.details.fullname,
                                    username: doc.details.username,
                                    user_id: doc.user_id,
                                    profile_image_link: doc.details.profile_image_link
                                }
                            }))
                        } else {
                            res.send(responseMessageCreator("Error", 0))
                        }
                    })

                } else {
                    res.status(400).send(responseMessageCreator("Invalid username", 0))
                }
            })
        }
    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}

export const getLatestArticle = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {

        let body = _.pick(req.body, ["page", "limit"])
        if (body.page == null || isNaN(body.page)) {
            body.page = 0
        }

        if (body.limit == null || isNaN(body.limit)) {
            body.limit = 10
        }
        Article.aggregate([
            { $skip: (+body.page) * 10 },
            { $limit: +body.limit },
            { $sort: { _id: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "author_id",
                    foreignField: "user_id",
                    as: "author_details"
                }
            }
        ]).then((doc: any) => {
            if (doc) {

                // console.log(doc)
                if (doc.length > 0) {
                    doc = doc.map((item: any) => {

                        let d = _.pick(item, ["created_on",
                            "article_id",
                            "article_banner",
                            "views",
                            "community_id",
                            "belongs_to_community",
                            "moderation_status",
                            "duration_of_article",
                            "title",
                            "preview",
                            "likes",
                            "tags",
                        ])

                        let author_details = {
                            fullname: item.author_details[0].details.fullname,
                            username: item.author_details[0].details.username,
                            user_id: item.author_details[0].user_id,
                            profile_image_link: item.author_details[0].details.profile_image_link
                        }

                        d.likes = (d.likes) ? d.likes.length : 0

                        return {
                            ...d,
                            author_details
                        }
                    })
                }
                res.send(responseMessageCreator({ data: doc }))

            } else {
                res.send(responseMessageCreator("Error", 0))
            }
        })


    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}

export const getPopularArticle = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {

        let body = _.pick(req.body, ["page", "limit"])
        if (body.page == null || isNaN(body.page)) {
            body.page = 0
        }

        if (body.limit == null || isNaN(body.limit)) {
            body.limit = 10
        }
        Article.aggregate([
            { $skip: (+body.page) * 10 },
            { $limit: +body.limit },
            { $sort: { views: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "author_id",
                    foreignField: "user_id",
                    as: "author_details"
                }
            }
        ]).then((doc: any) => {
            if (doc) {

                // console.log(doc)
                if (doc.length > 0) {
                    doc = doc.map((item: any) => {

                        let d = _.pick(item, ["created_on",
                            "article_id",
                            "article_banner",
                            "views",
                            "community_id",
                            "belongs_to_community",
                            "moderation_status",
                            "duration_of_article",
                            "title",
                            "preview",
                            "likes",
                            "tags",
                        ])

                        let author_details = {
                            fullname: item.author_details[0].details.fullname,
                            username: item.author_details[0].details.username,
                            user_id: item.author_details[0].user_id,
                            profile_image_link: item.author_details[0].details.profile_image_link
                        }

                        d.likes = (d.likes) ? d.likes.length : 0

                        return {
                            ...d,
                            author_details
                        }
                    })
                }
                res.send(responseMessageCreator({ data: doc }))

            } else {
                res.send(responseMessageCreator("Error", 0))
            }
        })


    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}

export const getFeaturedArticle = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {

        let body = _.pick(req.body, ["page", "limit"])
        if (body.page == null || isNaN(body.page)) {
            body.page = 0
        }

        if (body.limit == null || isNaN(body.limit)) {
            body.limit = 10
        }
        Article.aggregate([
            { $match: { article_type: ArticleType.FEATURED } },
            { $skip: (+body.page) * 10 },
            { $limit: +body.limit },
            { $sort: { _id: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "author_id",
                    foreignField: "user_id",
                    as: "author_details"
                }
            }
        ]).then((doc: any) => {
            if (doc) {

                // console.log(doc)
                if (doc.length > 0) {
                    doc = doc.map((item: any) => {

                        let d = _.pick(item, ["created_on",
                            "article_id",
                            "article_banner",
                            "views",
                            "community_id",
                            "belongs_to_community",
                            "moderation_status",
                            "duration_of_article",
                            "title",
                            "preview",
                            "likes",
                            "tags",
                        ])

                        let author_details = {
                            fullname: item.author_details[0].details.fullname,
                            username: item.author_details[0].details.username,
                            user_id: item.author_details[0].user_id,
                            profile_image_link: item.author_details[0].details.profile_image_link
                        }

                        d.likes = (d.likes) ? d.likes.length : 0

                        return {
                            ...d,
                            author_details
                        }
                    })
                }
                res.send(responseMessageCreator({ data: doc }))

            } else {
                res.send(responseMessageCreator("Error", 0))
            }
        })


    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}


export const getArticleByCommunityId = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {
        let body = _.pick(req.body, ["community_id", "mode", "page", "limit"])

        if (body.mode == null || isNaN(body.mode) || body.mode < 0 || body.mode > 2) {
            body.mode = CommunityArticleQuery.LATEST
        }

        if (body.community_id == null || body.community_id == "NA") {
            res.status(400).send(responseMessageCreator("Invalid community id", 0))
        } else {

            if (body.page == null || isNaN(body.page)) {
                body.page = 0
            }

            if (body.limit == null || isNaN(body.limit)) {
                body.limit = 10
            }

            let query = []
            if (body.mode == CommunityArticleQuery.FEATURED) {
                query.push({
                    $match: {
                        community_id: body.community_id,
                        article_type: ArticleType.FEATURED
                    }
                })
            } else {
                query.push({ $match: { community_id: body.community_id } })
            }
            query.push({ $skip: (+body.page) * 10 })
            query.push({ $limit: +body.limit })
            if (body.mode == CommunityArticleQuery.LATEST || body.mode == CommunityArticleQuery.FEATURED) {
                query.push({ $sort: { _id: -1 } })
            } else if (body.mode == CommunityArticleQuery.POPULAR) {
                query.push({ $sort: { views: -1 } })
            }

            query.push({
                $lookup: {
                    from: "users",
                    localField: "author_id",
                    foreignField: "user_id",
                    as: "author_details"
                }
            })

            Article.aggregate(query).then((doc: any) => {
                if (doc) {
                    doc = doc.map((item: any) => {

                        let d = _.pick(item, ["created_on",
                            "article_id",
                            "article_banner",
                            "views",
                            "community_id",
                            "belongs_to_community",
                            "moderation_status",
                            "duration_of_article",
                            "title",
                            "preview",
                            "likes",
                            "tags",
                        ])

                        let author_details = {
                            fullname: item.author_details[0].details.fullname,
                            username: item.author_details[0].details.username,
                            user_id: item.author_details[0].user_id,
                            profile_image_link: item.author_details[0].details.profile_image_link
                        }

                        d.likes = (d.likes) ? d.likes.length : 0

                        return {
                            ...d,
                            author_details
                        }
                    })

                    res.send(responseMessageCreator({ data: doc }))
                } else {
                    res.send(responseMessageCreator("Error", 0))
                }
            })
        }
    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}
export const UpdateArticleById = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {
        let body = _.pick(req.body, ["title", "content", "preview", "article_id", "article_banner", "tags"])
        if (body.article_id == null) {
            res.status(400).send(responseMessageCreator("Invalid article id", 0))
        } else if (body.title == null) {
            res.status(400).send(responseMessageCreator("Invalid article title", 0))
        } else if (body.title.length > 150) {
            res.status(400).send(responseMessageCreator("Invalid article title", 0))
        } else if (body.content == null) {
            res.status(400).send(responseMessageCreator("Invalid article content", 0))
        } else if (body.preview == null) {
            res.status(400).send(responseMessageCreator("Invalid article preview", 0))
        } else {
            let d: any = new Object()

            d.title = body.title
            d.content = body.content
            d.preview = body.preview

            if (body.tags) {
                if (body.tags.length > 0 && Array.isArray(body.tags)) {
                    body.tags = body.tags.map((i: any) => {
                        return {
                            tag: i,
                            added_on: Date.now()
                        }
                    })

                    d.tags = body.tags
                }
            }
            Article.findOne({
                article_id: body.article_id
            }).then((doc: any) => {
                if (doc) {
                    if (doc.author_id == req.user.user_id) {
                        Article.findOneAndUpdate({
                            article_id: body.article_id,
                            author_id: req.user.user_id
                        }, {
                            ...d,
                            edited: 1,
                            last_edited_on: Date.now(),
                            article_banner: (body.article_banner) ? body.article_banner : "NA"
                        }).then((doc: any) => {
                            if (doc) {
                                res.send(responseMessageCreator({ data: doc }))
                            } else {
                                res.status(400).send(responseMessageCreator("No Article found", 0))
                            }
                        })
                    } else {
                        res.status(401).send(responseMessageCreator("Invalid Auth", 0))
                    }
                } else {
                    res.status(400).send(responseMessageCreator("No Article found", 0))
                }
            })
        }
    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}
export const deleteArticleById = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {
        // Article.deleteOne({ article_id: req.body.article_id }, function (err) {
        //     if (err) logger(err)
        //     else
        //         res.send(responseMessageCreator("Article has been deleted", 1))
        // })

        let body = _.pick(req.body, ["article_id"])

        if (body.article_id == null) {
            res.send(responseMessageCreator("Invalid article id", 0))
        } else {
            Article.exists({
                article_id: body.article_id
            }).then((doc: any) => {
                if (doc) {
                    if (doc.author_id == req.user.user_id) {
                        Article.deleteOne({
                            article_id: body.article_id
                        }).then((d) => {
                            res.send(responseMessageCreator({ data: d }, 1))
                        }).catch((e) => {
                            res.send(responseMessageCreator(e, 0))
                        })
                    } else {
                        res.status(401).send(responseMessageCreator("INVALID AUTH", 0))
                    }
                } else {
                    res.status(400).send(responseMessageCreator("No Article found", 0))
                }
            })
        }

    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}

export const deleteAllUserArticleByUserId = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {
        let body = _.pick(req.body, ["author_id"])

        if (body.author_id == null) {
            res.status(400).send(responseMessageCreator("Invalid user id", 0))
        } else {
            Article.exists({
                author_id: body.author_id
            }).then((doc) => {
                if (doc) {
                    if (body.author_id == req.user.user_id) {
                        Article.deleteMany({
                            author_id: body.author_id
                        }).then((doc) => {
                            if (doc) {
                                res.send(responseMessageCreator("Successfully deleted all articles", 1))
                            } else {

                            }
                        }).catch((e) => {
                            res.status(400).send(responseMessageCreator(e, 0))
                        })
                    } else {
                        res.status(401).send(responseMessageCreator("INVALID AUTH", 0))
                    }
                } else {
                    res.status(400).send(responseMessageCreator("No user found", 0))
                }
            })
        }
    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}


export const deleteAllCommunityArticleByCommunityId = (req: Request, res: Response) => {
    let version = req.params.version
    if (version == "v1") {
        if (!Object.prototype.hasOwnProperty.call(req.body, "community_id")) {
            res.status(400).send(responseMessageCreator("No community id is provided!", 0))
            return
        }
        const community_id = req.body.community_id
        Article.exists({ community_id: community_id }).then((result) => {
            if (result) {
                Article.deleteMany({ community_id: community_id }, (err) => {
                    if (err) {
                        logger(err)
                        res.status(500).send(responseMessageCreator("Internal Server Error!", 0))
                    }
                    else {
                        res.status(200).send(responseMessageCreator("Articles of this community deleted Successfully", 1))
                    }
                })
            }
            else {
                res.status(404).send(responseMessageCreator("No articles present in this community!", 0))
            }
        }).catch((err) => {
            logger(err)
            res.status(500).send(responseMessageCreator("Internal Server Error!", 0))
        })
    }
    else {
        res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
    }
}

export default {
    createArticle,
    getArticleById,

    getLatestArticle,
    getFeaturedArticle,
    getPopularArticle,

    getArticlesByUserId,
    getArticlesByUsername,
    getArticleByCommunityId,
    UpdateArticleById,
    deleteArticleById,
    deleteAllUserArticleByUserId,
    deleteAllCommunityArticleByCommunityId
}
// export const s = (req: Request, res: Response) => {
//     let version = req.params.version
//     if (version == "v1") {

//     } else {
//         res.status(400).send(responseMessageCreator("Invalid API version provided!", 0))
//     }
// }