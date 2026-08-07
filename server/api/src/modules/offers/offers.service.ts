import { integrations } from "../../integrations/index.ts";
import { AppError } from "../../utils/App.Error.ts";
import { salaryBenchmark } from "../ai-clients/ai.client.ts";
import Application from "../applications/application.model.ts";
import Job from "../jobs/job.model.ts";
import OnboardingPacket from "../onboarding/onboarding.model.ts";
import {
  clampOfferToBand,
  offerDecisionStage,
  recommendSalary,
} from "./offer.helpers.ts";
import Offer from "./offer.model.ts";

/** Create a draft offer using AI salary benchmark (clamped to band). */
export async function createOffer(input: {
  applicationId: string;
  salary?: number;
  createdBy: string;
}) {
  const application = await Application.findById(input.applicationId).populate(
    "jobId",
  );
  if (!application) throw new AppError("Application not found", 404, "NOT_FOUND");

  const job = await Job.findById(application.jobId);
  if (!job) throw new AppError("Job not found", 404, "NOT_FOUND");

  const benchmark = await salaryBenchmark({ title: job.title });
  const recommended = recommendSalary(benchmark.mid, input.salary);
  const salary = clampOfferToBand(recommended, {
    min: benchmark.min,
    mid: benchmark.mid,
    max: benchmark.max,
  });

  const offer = await Offer.create({
    applicationId: application._id,
    candidateId: application.candidateId,
    jobId: application.jobId,
    salary,
    currency: benchmark.currency,
    benchmark,
    createdBy: input.createdBy,
    status: "draft",
  });

  await Application.findByIdAndUpdate(application._id, { stage: "offer" });
  return offer;
}

export async function listOffers() {
  return Offer.find()
    .populate("candidateId", "name email")
    .populate("jobId", "title")
    .sort({ createdAt: -1 });
}

export async function getOffer(id: string) {
  const offer = await Offer.findById(id)
    .populate("candidateId", "name email")
    .populate("jobId", "title");
  if (!offer) throw new AppError("Offer not found", 404, "NOT_FOUND");
  return offer;
}

export async function sendOffer(id: string) {
  const offer = await getOffer(id);
  const candidate = offer.candidateId as { name?: string; email?: string };
  const envelope = await integrations.esign.sendEnvelope({
    documentName: `Offer-${offer._id}.pdf`,
    signerEmail: candidate.email ?? "candidate@stub.local",
    signerName: candidate.name ?? "Candidate",
    content: `Offer letter for salary ${offer.salary} ${offer.currency}`,
  });

  offer.status = "sent";
  offer.envelopeId = envelope.envelopeId;
  offer.signingUrl = envelope.signingUrl;
  await offer.save();

  await integrations.email.sendEmail({
    to: candidate.email ?? "candidate@stub.local",
    subject: "Your offer letter",
    body: `Please sign: ${envelope.signingUrl}`,
  });

  return offer;
}

export async function respondToOffer(id: string, decision: "accepted" | "declined") {
  const offer = await getOffer(id);
  offer.status = decision;
  await offer.save();

  // accepted → hired + onboarding packet; declined → rejected stage
  const nextStage = offerDecisionStage(decision);
  await Application.findByIdAndUpdate(offer.applicationId, { stage: nextStage });

  if (decision === "accepted") {
    await OnboardingPacket.create({
      offerId: offer._id,
      candidateId: offer.candidateId,
      status: "in_progress",
      checklist: [
        { item: "Sign employment agreement", done: false },
        { item: "Submit ID documents", done: false },
        { item: "Complete tax forms", done: false },
        { item: "Laptop provisioning", done: false },
      ],
      documents: [
        { name: "Government ID", status: "requested" },
        { name: "Address proof", status: "requested" },
      ],
    });
  }

  return offer;
}
