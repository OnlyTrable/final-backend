// src/controllers/follow.controller.ts (ПОВНИЙ КОД)

import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import User from '../db/models/User.model.js';
import Follow from '../db/models/Follow.model.js';
import Notification from '../db/models/Notification.model.js'; // 🔥 ІМПОРТ
import HttpError from '../utils/HttpError.js';

// Інтерфейси
interface FollowParams { userId: string; }
interface FollowQuery { page?: string; limit?: string; }

/**
 * 🚀 Обробляє підписку або відписку.
 * POST /api/follow/:userId
 */
export const toggleFollow = async (
    req: Request<FollowParams>, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const followerId = req.userId;
        const { userId: followingId } = req.params;

        if (!followerId) {
            return next(HttpError(401, "Not authenticated."));
        }

        if (followerId === followingId) {
            return next(HttpError(400, "Cannot follow yourself."));
        }

        const followerObjectId = new Types.ObjectId(followerId);
        const followingObjectId = new Types.ObjectId(followingId);

        const followingUser = await User.findById(followingObjectId);
        if (!followingUser) {
            return next(HttpError(404, "Target user not found."));
        }

        const existingFollow = await Follow.findOne({
            follower: followerObjectId,
            following: followingObjectId,
        });

        let isFollowing: boolean;
        let message: string;
        let status: number;
        let followerUser;
        
        if (existingFollow) {
            // A. Відписка (Unfollow)
            await existingFollow.deleteOne();
            isFollowing = false;
            message = "Successfully unfollowed user.";
            status = 200;

            followingUser.followersCount = Math.max(0, followingUser.followersCount - 1);
            await followingUser.save();
            
            followerUser = await User.findByIdAndUpdate(
                followerObjectId,
                { $inc: { followingCount: -1 } },
                { new: true }
            );

        } else {
            // B. Підписка (Follow)
            await Follow.create({
                follower: followerObjectId,
                following: followingObjectId,
            });
            isFollowing = true;
            message = "Successfully followed user.";
            status = 201;

            followingUser.followersCount += 1;
            await followingUser.save();
            
            followerUser = await User.findByIdAndUpdate(
                followerObjectId,
                { $inc: { followingCount: 1 } },
                { new: true }
            );
            
            // 🔥 СТВОРЕННЯ СПОВІЩЕННЯ:
            await Notification.create({
                recipient: followingObjectId, 
                sender: followerObjectId,     
                type: 'follow',
            });
        }

        res.status(status).json({
            message: message,
            isFollowing: isFollowing,
            followingUserFollowersCount: followingUser.followersCount,
            currentUserFollowingCount: followerUser?.followingCount,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * 🚀 Отримує список користувачів, на яких підписаний користувач (Following).
 * GET /api/follow/:userId/following?page=1&limit=10
 */
export const getFollowing = async (
    req: Request<FollowParams, {}, {}, FollowQuery>, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const { userId } = req.params; 
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;
        
        const userObjectId = new Types.ObjectId(userId);

        const followingRecords = await Follow.find({ follower: userObjectId })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'following', 
                select: '_id username fullName avatarUrl',
            })
            .lean();

        const total = (await User.findById(userObjectId).select('followingCount'))?.followingCount || 0;
        
        const followingList = followingRecords.map(record => record.following);

        res.status(200).json({
            following: followingList,
            meta: { total, currentPage: page, limit: limit, totalPages: Math.ceil(total / limit) },
        });

    } catch (error) {
        next(error);
    }
};


/**
 * 🚀 Отримує список підписників користувача (Followers).
 * GET /api/follow/:userId/followers?page=1&limit=10
 */
export const getFollowers = async (
    req: Request<FollowParams, {}, {}, FollowQuery>, 
    res: Response,
    next: NextFunction,
) => {
    try {
        const { userId } = req.params; 
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;

        const userObjectId = new Types.ObjectId(userId);

        const followerRecords = await Follow.find({ following: userObjectId })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'follower', 
                select: '_id username fullName avatarUrl', 
            })
            .lean();

        const total = (await User.findById(userObjectId).select('followersCount'))?.followersCount || 0;

        const followersList = followerRecords.map(record => record.follower);

        res.status(200).json({
            followers: followersList,
            meta: { total, currentPage: page, limit: limit, totalPages: Math.ceil(total / limit) },
        });

    } catch (error) {
        next(error);
    }
};