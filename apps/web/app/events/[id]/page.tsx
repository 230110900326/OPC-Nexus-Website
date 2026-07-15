import { EventDetail } from "../../../components/event-detail";
import { SiteHeader } from "../../../components/site-header";
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><SiteHeader /><EventDetail id={id} /></>; }
