import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../services/queryKeys';
import { STALE, GC } from '../services/queryClient';
import courseContestService from '../services/courseContestService';

export function useCourseContests(options = {}) {
    return useQuery({
        queryKey: queryKeys.courseContests.all(),
        queryFn: () => courseContestService.getAllCourseContests(),
        staleTime: STALE.LONG,
        gcTime: GC.LONG,
        ...options
    });
}

export function useCourseContest(id, options = {}) {
    return useQuery({
        queryKey: queryKeys.courseContests.detail(id),
        queryFn: () => courseContestService.getCourseContestById(id),
        enabled: !!id,
        staleTime: STALE.SHORT, // Better for live contest data
        ...options
    });
}

export function useCourseContestLeaderboard(id, options = {}) {
    return useQuery({
        queryKey: queryKeys.courseContests.leaderboard(id),
        queryFn: () => courseContestService.getLeaderboard(id),
        enabled: !!id,
        staleTime: STALE.SHORT,
        ...options
    });
}

export function useCourseContestSubmissions(id, options = {}) {
    return useQuery({
        queryKey: queryKeys.courseContests.submissions(id),
        queryFn: () => courseContestService.getSubmissions(id),
        enabled: !!id,
        staleTime: STALE.SHORT,
        ...options
    });
}

export function useCreateCourseContest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => courseContestService.createCourseContest(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.all() });
        }
    });
}

export function useUpdateCourseContest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => courseContestService.updateCourseContest(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.all() });
        }
    });
}

export function useDeleteCourseContest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => courseContestService.deleteCourseContest(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.all() });
        }
    });
}

export function useSubmitCourseContestCode() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => courseContestService.submitCode(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.submissions(id) });
        }
    });
}

export function useFinishCourseContest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => courseContestService.finishCourseContest(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.submissions(id) });
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.leaderboard(id) });
        }
    });
}

export function useStartNewAttempt() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => courseContestService.startNewAttempt(id),
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: queryKeys.courseContests.detail(id) });
        }
    });
}
