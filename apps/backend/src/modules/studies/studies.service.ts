import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Study } from './study.entity';
import { AiService } from '../ai-service/ai.service';
import { AiResult } from '../ai-service/ai-result.entity';
import { Feedback } from '../feedback/feedback.entity';

@Injectable()
export class StudiesService {
  constructor(
    @InjectRepository(Study)
    private readonly studiesRepository: Repository<Study>,

    @InjectRepository(AiResult)
    private readonly aiResultsRepository: Repository<AiResult>,

    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,

    private readonly aiService: AiService,
  ) {}

  async findAll() {
    return this.studiesRepository.find({
      relations: ['aiResults'],
      order: { uploaded_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    const study = await this.studiesRepository.findOne({
      where: { id },
      relations: ['aiResults'],
    });

    if (!study) {
      throw new NotFoundException('Study not found');
    }

    const feedbacks = await this.feedbackRepository.find({
      where: { study_id: id },
      order: { created_at: 'DESC' },
    });

    return {
      ...study,
      feedbacks,
    };
  }

  async getWorklist() {
    const studies = await this.studiesRepository.find({
      relations: ['aiResults'],
    });

    const feedbacks = await this.feedbackRepository.find();

    const studiesWithFeedbacks = studies.map((study) => ({
      ...study,
      feedbacks: feedbacks.filter((feedback) => feedback.study_id === study.id),
    }));

    return studiesWithFeedbacks.sort((a, b) => {
      const aPriority = a.aiResults?.[0]?.priority || 'needs_review';
      const bPriority = b.aiResults?.[0]?.priority || 'needs_review';

      const priorityDiff =
        this.getPriorityRank(aPriority) - this.getPriorityRank(bPriority);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return (
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
    });
  }

  async createStudy(file: any) {
    const originalName = file?.originalname || 'unknown-xray.png';
    const savedFileName = file?.filename || 'unknown-xray.png';

    const count = await this.studiesRepository.count();
    const patientNumber = String(count + 1).padStart(4, '0');

    const study = this.studiesRepository.create({
      patient_id: `XR-2026-${patientNumber}`,
      image_path: `/uploads/${savedFileName}`,
      original_name: originalName,
      status: 'processing',
    });

    const savedStudy = await this.studiesRepository.save(study);

    const result = await this.aiService.analyzeImage(originalName);

    const priority = this.calculatePriority(
      result.classification,
      result.confidence,
    );

    const message = this.generateMessage(
      result.classification,
      result.confidence,
    );

    await this.aiResultsRepository.save({
      study: savedStudy,
      label: result.classification,
      confidence: result.confidence,
      priority,
      message,
      heatmap_path: '/heatmaps/mock-heatmap.png',
    });

    savedStudy.status = 'completed';

    return this.studiesRepository.save(savedStudy);
  }

  async updateStatus(id: string, status: string) {
    const study = await this.studiesRepository.findOne({
      where: { id },
    });

    if (!study) {
      throw new NotFoundException('Study not found');
    }

    study.status = status;

    return this.studiesRepository.save(study);
  }

  async addFeedback(id: string, decision: string, comment: string) {
    const feedback = this.feedbackRepository.create({
      study_id: id,
      decision,
      comment: comment || '',
    });

    return this.feedbackRepository.save(feedback);
  }

  private calculatePriority(label: string, confidence: number) {
    if (label === 'abnormal' && confidence >= 0.85) return 'high';
    if (label === 'abnormal' && confidence >= 0.65) return 'medium';
    if (label === 'normal' && confidence >= 0.85) return 'low';

    return 'needs_review';
  }

  private generateMessage(label: string, confidence: number) {
    if (label === 'abnormal' && confidence >= 0.85) {
      return 'Possible lung opacity detected. Immediate radiologist review and CT correlation are recommended.';
    }

    if (label === 'abnormal') {
      return 'Possible abnormal pattern detected. Follow-up imaging or specialist review is recommended.';
    }

    if (label === 'normal') {
      return 'No significant abnormal findings detected. Routine follow-up if clinically needed.';
    }

    return 'AI confidence is low. Human radiologist review is required before decision.';
  }

  private getPriorityRank(priority: string) {
    if (priority === 'high') return 1;
    if (priority === 'needs_review') return 2;
    if (priority === 'medium') return 3;
    if (priority === 'low') return 4;

    return 5;
  }
}

