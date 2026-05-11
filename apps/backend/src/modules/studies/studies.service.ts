import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Study } from './study.entity';
import { AiResult } from '../ai-service/ai-result.entity';
import { Feedback } from '../feedback/feedback.entity';
import { AiService } from '../ai-service/ai.service';
import { Patient } from '../patients/patient.entity';
@Injectable()
export class StudiesService {
  constructor(
    @InjectRepository(Study)
    private readonly studiesRepository: Repository<Study>,

    @InjectRepository(AiResult)
    private readonly aiResultsRepository: Repository<AiResult>,

    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,

    @InjectRepository(Patient)
private readonly patientsRepository: Repository<Patient>,

    private readonly aiService: AiService,
  ) {}

  async findAll() {
    return this.studiesRepository.find({
      relations: ['aiResults', 'feedbacks'],
      order: {
        uploadedAt: 'DESC',
      },
    });
  }

  async findOne(id: string) {
    const study = await this.studiesRepository.findOne({
      where: { id },
      relations: ['aiResults', 'feedbacks'],
    });

    if (!study) {
      throw new NotFoundException('Study not found');
    }

    return study;
  }

  async getWorklist() {
    const studies = await this.studiesRepository.find({
      relations: ['aiResults', 'feedbacks'],
      order: {
        uploadedAt: 'DESC',
      },
    });

    return studies.sort((a, b) => {
      const aPriority = a.aiResults?.[0]?.priority || 'Low';
      const bPriority = b.aiResults?.[0]?.priority || 'Low';

      const priorityDiff =
        this.getPriorityRank(aPriority) - this.getPriorityRank(bPriority);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return (
        new Date(b.uploadedAt).getTime() -
        new Date(a.uploadedAt).getTime()
      );
    });
  }

  async createStudy(file: any) {
    const originalName = file?.originalname || 'unknown-xray.png';
    const savedFileName = file?.filename || 'unknown-xray.png';

    const count = await this.studiesRepository.count();
    const patientNumber = String(count + 1).padStart(4, '0');
let patient = await this.patientsRepository.findOne({
  where: { medicalRecordNumber: 'MRN-0001' },
});

if (!patient) {
  patient = this.patientsRepository.create({
    fullName: 'Test Patient',
    age: 35,
    gender: 'Unknown',
    phoneNumber: '00000002',
    medicalRecordNumber: 'MRN-0001',
  });

  patient = await this.patientsRepository.save(patient);
}
    const study = new Study();

    study.patientId = patient.id;
    study.imagePath = `/uploads/${savedFileName}`;
    study.originalName = originalName;
    study.status = 'processing';

    const savedStudy = await this.studiesRepository.save(study);

    const result = await this.aiService.analyzeImage(file.path);

    const priority = this.getPriority(
      result.classification,
      result.confidence,
    );

    const message = this.generateMessage(
      result.classification,
      result.confidence,
    );

    const aiResult = this.aiResultsRepository.create({
  study: savedStudy,
  label: result.classification,
  confidence: result.confidence,
  priority,
  message,
});

await this.aiResultsRepository.save(aiResult);

    savedStudy.status = 'completed';

    return this.studiesRepository.save(savedStudy);
  }

  async addFeedback(
  studyId: string,
  radiologistDecision: string,
  notes: string,
) {
  const study = await this.findOne(studyId);

  const feedback = this.feedbackRepository.create({
  study_id: studyId,
  decision: radiologistDecision,
  comment: notes,
});

  await this.feedbackRepository.save(feedback);

  return {
    success: true,
    message: 'Feedback added successfully',
  };
}

  private getPriority(classification: string, confidence: number): string {
    const normalizedClassification = classification.toLowerCase();

    if (normalizedClassification === 'abnormal' && confidence >= 0.85) {
      return 'High';
    }

    if (
      normalizedClassification === 'abnormal' &&
      confidence >= 0.65 &&
      confidence < 0.85
    ) {
      return 'Medium';
    }

    if (normalizedClassification === 'normal' && confidence >= 0.85) {
      return 'Low';
    }

    return 'Needs Review';
  }

  private getPriorityRank(priority: string): number {
    switch (priority) {
      case 'High':
        return 1;

      case 'Medium':
        return 2;

      case 'Needs Review':
        return 3;

      case 'Low':
        return 4;

      default:
        return 5;
    }
  }

  private generateMessage(classification: string, confidence: number): string {
    const normalizedClassification = classification.toLowerCase();
    const percent = (confidence * 100).toFixed(1);

    if (normalizedClassification === 'abnormal') {
      return `Potential abnormality detected with ${percent}% confidence.`;
    }

    if (normalizedClassification === 'normal') {
      return `No major abnormality detected. Confidence: ${percent}%.`;
    }

    return `AI confidence is low. Radiologist review is required. Confidence: ${percent}%.`;
  }
async updateStatus(id: string, status: string) {
  const study = await this.findOne(id);

  study.status = status;

  return this.studiesRepository.save(study);
}  
}
