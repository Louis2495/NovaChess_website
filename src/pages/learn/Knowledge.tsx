import { useData } from "../../lib/store";
import HistoryExplorer, {type HistoryData} from "./History";
import {Loading} from "../../components/UI";
export default function KnowledgePage({section:_section}:{section:string}) {
 const {data,error}=useData<HistoryData>("learning");
 return data ? <HistoryExplorer data={data}/> : <Loading error={error}/>;
}
