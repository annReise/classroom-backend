import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express"
import { departements, subjects } from "../db/schema";
import { db } from "../db";

const router = express.Router();

//Get all subjects with optional search, filtering and pagination
router.get("/", async (req, res) => {
    try {
        const { search, departement, page = '1', limit = '10' } = req.query;
        const parsePositiveInt = (value: unknown, fallback: number) => {
            const raw = Array.isArray(value) ? value[0] : value;
            const n = typeof raw === 'string' ? Number(raw) : NaN;
            return Number.isFinite(n) && n >= 1 ? n : fallback;
            };

       const currentPage = parsePositiveInt(page, 1);
       const limitPerPage = parsePositiveInt(limit, 10);


        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // if search query exists, filter by subject name OR subject code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`),
                )
            );
        }

        // if departement provided, filter by departement id
        if (departement !== undefined) {    
            const depRaw = Array.isArray(departement) ? departement[0] : departement;
            const depId = typeof depRaw === 'string' ? Number(depRaw) : NaN;          
        if (!Number.isFinite(depId)) {
        return res.status(400).json({ error: "Invalid departement" });
        }
        filterConditions.push(eq(subjects.departementId, depId));
        }

        // combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        let totalCount = 0;

        // Count query with its own error handling
        let countResult;
        try {
            countResult = await db
                .select({ count: sql<number>`count(*)` })
                .from(subjects)
                .leftJoin(departements, eq(subjects.departementId, departements.id))
                .where(whereClause);

            totalCount = countResult[0]?.count ?? 0;
        } catch (err) {
            console.error('GET /subjects count query error:', err);
            return res.status(500).json({ error: 'Failed to count subjects' });
        }

        // Fetch subjects with its own error handling
        let subjectList;
        try {
            subjectList = await db
                .select({
                    ...getTableColumns(subjects),
                    departement: { ...getTableColumns(departements) }
                })
                .from(subjects)
                .leftJoin(departements, eq(subjects.departementId, departements.id))
                .where(whereClause)
                .orderBy(desc(subjects.createdAt))
                .limit(limitPerPage)
                .offset(offset);
        } catch (err) {
            console.error('GET /subjects select query error:', err);
            return res.status(500).json({ error: 'Failed to fetch subjects' });
        }

        res.status(200).json({
            data: subjectList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });
    } catch (e: unknown) {
        console.error('GET /subjects error:', e);
        if (e instanceof Error) console.error(e.stack);
        res.status(500).json({ error: 'Failed to get subjects' });
    }
})

export default router;